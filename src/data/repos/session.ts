import { useEffect, useState } from "react";
import { err } from "@/domain/result";
import type { Account } from "@/domain/schemas";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_NEW_NOTE_DRAFT,
  FIXTURE_PLACES,
  FIXTURE_SHEET_TARGETS,
  FIXTURE_UNKNOWN_PLACE,
  FIXTURE_UPLOADS,
  type FixtureUpload,
  fixturePhotoImage,
} from "@/fixtures/data";
import { type FixtureParams, parseFixtureParams } from "@/fixtures/params";
import { accountDbName, FIXTURE_DB_NAME, openGlanceDb } from "../db";
import {
  clearSignedInAccount,
  openMetaDb,
  readSignedInAccount,
  saveSignedInAccount,
} from "../meta";
import { createFixtureAuth, createFixtureTransport, seedFixtureDb } from "../sync/fixtureTransport";
import { createInlineSyncHost } from "../sync/host";
import type { Transport } from "../sync/transport";
import { apiPhotoSrc } from "./photos";
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
};

export const fixtureUploads = FIXTURE_UPLOADS;

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

const noNudge = () => {};

const notConnected = async () => err("network" as const);

const offlineAuth: Transport["auth"] = {
  link: notConnected,
  status: notConnected,
  name: notConnected,
  signout: notConnected,
};

async function rememberSignedIn(account: Account): Promise<void> {
  const meta = openMetaDb();

  const entry = { accountId: account.id, name: account.name, email: account.email };

  await saveSignedInAccount(meta, entry).finally(() => meta.close());
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
  const auth = demo ? createFixtureAuth(params) : offlineAuth;

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

  const store = {
    db,
    accountId: account.accountId,
    account: { name: account.name, email: account.email },
    now,
    startedAt: now(),
    nudge: noNudge,
    refreshWeather: noNudge,
    photoSrc: apiPhotoSrc,
    upload: notConnected,
    places: notConnected,
    signOut: signOutWith(offlineAuth.signout),
  };

  return { boot: { kind: "ready", store }, close: () => db.close() };
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
