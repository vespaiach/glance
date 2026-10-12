import { useEffect, useState } from "react";
import type { Account } from "@/domain/schemas";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_LOCATED_PLACE,
  FIXTURE_NEW_NOTE_DRAFT,
  FIXTURE_PLACES,
  FIXTURE_SHEET_TARGETS,
  FIXTURE_TIME_ZONE,
  FIXTURE_UNKNOWN_PLACE,
  FIXTURE_UPLOADS,
  type FixtureUpload,
  fixturePhotoImage,
} from "@/fixtures/data";
import { type FixtureParams, parseFixtureParams } from "@/fixtures/params";
import { accountDbName, deleteGlanceDb, FIXTURE_DB_NAME, openGlanceDb } from "../db";
import {
  clearSignedInAccount,
  type MetaDb,
  openMetaDb,
  readSignedInAccount,
  type SignedInAccount,
  saveSignedInAccount,
} from "../meta";
import { createFixtureAuth, createFixtureTransport, seedFixtureDb } from "../sync/fixtureTransport";
import { createInlineSyncHost, createWorkerSyncHost, spawnSyncWorker } from "../sync/host";
import { createHttpTransport } from "../sync/httpTransport";
import { recordStatus } from "../sync/status";
import type { Transport } from "../sync/transport";
import { apiPhotoSrc } from "./photos";
import { appServiceWorker } from "./serviceWorker";
import type { PhotoVariant, RepoStore } from "./store";

export type { FixtureParams, FixtureUpload };

export const fixtureSheetTargets = {
  ...FIXTURE_SHEET_TARGETS,
  noteDraft: { text: FIXTURE_NEW_NOTE_DRAFT, tone: 2 },
} as const;

export const fixtureWeatherSearch = {
  query: "Portland",
  unknown: FIXTURE_UNKNOWN_PLACE,
  matches: FIXTURE_PLACES.portland ?? [],
  located: { draft: "Portland, OR", place: FIXTURE_LOCATED_PLACE },
};

export const fixtureUploads = FIXTURE_UPLOADS;

export const fixtureTimeZone = FIXTURE_TIME_ZONE;

export const fixtureSignIn = { ...FIXTURE_ACCOUNT, name: FIXTURE_ACCOUNT.name ?? "" };

export type SignInAuth = Pick<Transport["auth"], "link" | "status" | "name"> & {
  remember(account: Account): Promise<void>;
};

export type DisplayBoot =
  | { kind: "booting" }
  | { kind: "signed-out" }
  | { kind: "ready"; store: RepoStore };

type BootOptions = { demo: boolean; params: FixtureParams; now: () => Date };

type OpenedDisplay = { boot: DisplayBoot; close(): void };

const SIGNED_OUT: OpenedDisplay = { boot: { kind: "signed-out" }, close: () => {} };

const PHOTO_CACHE = "photos";

async function deleteAccountData(accountId: string): Promise<void> {
  await deleteGlanceDb(accountDbName(accountId));

  if ("caches" in globalThis) await caches.delete(PHOTO_CACHE);
}

function keepStorage() {
  if (!("storage" in navigator)) return;

  navigator.storage.persist().catch(() => {});
}

async function replaceSignedIn(meta: MetaDb, account: SignedInAccount): Promise<void> {
  const previous = await readSignedInAccount(meta);

  if (previous && previous.accountId !== account.accountId) {
    await deleteAccountData(previous.accountId);
  }

  await saveSignedInAccount(meta, account);
}

async function rememberSignedIn(account: Account): Promise<void> {
  const meta = openMetaDb();

  const entry = { accountId: account.id, name: account.name, email: account.email };

  await replaceSignedIn(meta, entry).finally(() => meta.close());

  keepStorage();
}

async function forgetSignedIn(): Promise<void> {
  const meta = openMetaDb();

  await clearSignedInAccount(meta).finally(() => meta.close());
}

function signOutWith(signout: Transport["auth"]["signout"]) {
  return async () => {
    await signout();

    await forgetSignedIn();
  };
}

export function signInAuthFor(demo: boolean, params: FixtureParams): SignInAuth {
  const auth = demo ? createFixtureAuth(params) : createHttpTransport().auth;

  return { link: auth.link, status: auth.status, name: auth.name, remember: rememberSignedIn };
}

const fixturePhotoSrc = (photoId: string, variant: PhotoVariant) =>
  fixturePhotoImage(photoId) ?? apiPhotoSrc(photoId, variant);

function keepUploadedImages(transport: Transport) {
  const images = new Map<string, string>();

  const upload: Transport["upload"] = async (file, onProgress) => {
    const answer = await transport.upload(file, onProgress);

    if (answer.ok) images.set(answer.value.id, URL.createObjectURL(file));

    return answer;
  };

  const photoSrc = (photoId: string, variant: PhotoVariant) =>
    images.get(photoId) ?? fixturePhotoSrc(photoId, variant);

  return { upload, photoSrc };
}

export function fixtureParamsFor(demo: boolean, search: string): FixtureParams {
  return demo ? parseFixtureParams(search) : {};
}

async function openFixtureDisplay(params: FixtureParams, now: () => Date): Promise<OpenedDisplay> {
  const db = openGlanceDb(FIXTURE_DB_NAME);

  const transport = createFixtureTransport({ db, params, now });

  const host = createInlineSyncHost({ db, transport, now });

  let closed = false;

  const close = () => {
    closed = true;
    host.stop();
    db.close();
  };

  await seedFixtureDb(db, params).catch((error: unknown) => {
    close();

    throw error;
  });

  host.start(FIXTURE_ACCOUNT.id).catch((error: unknown) => {
    if (!closed) throw error;
  });

  const store = {
    db,
    accountId: FIXTURE_ACCOUNT.id,
    account: FIXTURE_ACCOUNT,
    now,
    startedAt: now(),
    nudge: host.nudge,
    refreshWeather: host.refreshWeather,
    places: transport.places,
    locate: transport.locate,
    signOut: signOutWith(transport.auth.signout),
    ...keepUploadedImages(transport),
  };

  return { boot: { kind: "ready", store }, close };
}

async function openAccountDisplay(now: () => Date): Promise<OpenedDisplay> {
  const meta = openMetaDb();

  const account = await readSignedInAccount(meta).finally(() => meta.close());

  if (account === undefined) return SIGNED_OUT;

  const db = openGlanceDb(accountDbName(account.accountId));

  await recordStatus(db, { type: "restarted" });

  const transport = createHttpTransport();

  const { warmPhotos } = appServiceWorker();

  const host = createWorkerSyncHost({ db, spawn: spawnSyncWorker, photosChanged: warmPhotos });

  const close = () => {
    host.stop();
    db.close();
  };

  void host.start(account.accountId);

  const store = {
    db,
    accountId: account.accountId,
    account: { name: account.name, email: account.email },
    now,
    startedAt: now(),
    nudge: host.nudge,
    refreshWeather: host.refreshWeather,
    photoSrc: apiPhotoSrc,
    upload: transport.upload,
    places: transport.places,
    locate: transport.locate,
    signOut: async () => {
      close();

      await signOutWith(transport.auth.signout)();

      await deleteAccountData(account.accountId);
    },
  };

  return { boot: { kind: "ready", store }, close };
}

export function useDisplayBoot({ demo, params, now }: BootOptions): DisplayBoot {
  const [boot, setBoot] = useState<DisplayBoot>({ kind: "booting" });

  useEffect(() => {
    let live = true;

    const opening = demo ? openFixtureDisplay(params, now) : openAccountDisplay(now);

    opening.then(
      (opened) => {
        if (live) setBoot(opened.boot);
      },
      (error: unknown) => {
        if (live) throw error;
      },
    );

    return () => {
      live = false;

      opening.then(
        (opened) => opened.close(),
        () => {},
      );
    };
  }, [demo, params, now]);

  return boot;
}
