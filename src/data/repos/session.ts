import Dexie from "dexie";
import { useEffect, useState } from "react";
import type { Result } from "@/domain/result";
import type { Account, AccountSettings } from "@/domain/schemas";
import { accountDbName, deleteGlanceDb, openGlanceDb } from "../db";
import {
  clearSignedInAccount,
  type MetaDb,
  markRevoked,
  markSignedOut,
  openMetaDb,
  readSignedInAccount,
  type SignedInAccount,
  saveSignedInAccount,
} from "../meta";
import { createWorkerSyncHost, spawnSyncWorker } from "../sync/host";
import { createHttpTransport } from "../sync/httpTransport";
import { recordStatus } from "../sync/status";
import type { Transport, TransportError } from "../sync/transport";
import { apiPhotoSrc } from "./photos";
import { appServiceWorker } from "./serviceWorker";
import { accountSettings } from "./settings";
import type { RepoStore } from "./store";
import type { WeatherRepo } from "./weather";

export type SignedOutAccount = {
  email: string;
  pending: number;
  settings?: AccountSettings;
};

export type SignInAuth = Pick<
  Transport["auth"],
  "sendCode" | "verifyCode" | "verifyLink" | "status" | "name" | "location"
> &
  Pick<WeatherRepo, "searchPlaces" | "locate"> & {
    remember(account: Account): Promise<void>;
  };

export type DisplayBoot =
  | { kind: "booting" }
  | { kind: "signed-out" }
  | { kind: "ready"; store: RepoStore };

type OpenedDisplay = { boot: DisplayBoot; close(): void };

const SIGNED_OUT: OpenedDisplay = { boot: { kind: "signed-out" }, close: () => {} };

const PHOTO_CACHE = "photos";

export function signInAuth(): SignInAuth {
  const { auth, places, locate } = createHttpTransport();

  return {
    sendCode: auth.sendCode,
    verifyCode: auth.verifyCode,
    verifyLink: auth.verifyLink,
    status: auth.status,
    name: auth.name,
    location: auth.location,
    searchPlaces: places,
    locate,
    remember: rememberSignedIn,
  };
}

export async function signedOutAccount(): Promise<SignedOutAccount | undefined> {
  const entry = await readMeta(readSignedInAccount);

  if (!entry?.signedOut) return undefined;

  if (entry.revoked) return forgetRevoked(entry.accountId);

  return { email: entry.email, ...(await keptAccount(entry.accountId)) };
}

export function useDisplayBoot(now: () => Date): DisplayBoot {
  const [boot, setBoot] = useState<DisplayBoot>({ kind: "booting" });

  useEffect(() => {
    let live = true;

    const opening = openAccountDisplay(now);

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
  }, [now]);

  return boot;
}

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

async function readMeta<T>(read: (meta: MetaDb) => Promise<T>): Promise<T> {
  const meta = openMetaDb();

  return read(meta).finally(() => meta.close());
}

async function keptAccount(accountId: string) {
  const name = accountDbName(accountId);

  if (!(await Dexie.exists(name))) return { pending: 0, settings: accountSettings(undefined) };

  const db = openGlanceDb(name);

  const read = async () => ({
    pending: await db.outbox.count(),
    settings: accountSettings(await db.settings.get(accountId)),
  });

  return read().finally(() => db.close());
}

async function forgetRevoked(accountId: string): Promise<undefined> {
  await deleteAccountData(accountId);

  await forgetSignedIn();
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

async function openAccountDisplay(now: () => Date): Promise<OpenedDisplay> {
  const meta = openMetaDb();

  const account = await readSignedInAccount(meta).finally(() => meta.close());

  if (account === undefined || account.signedOut) return SIGNED_OUT;

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

  const signOut = async () => {
    close();

    await signOutWith(transport.auth.signout)();

    await deleteAccountData(account.accountId);
  };

  const store = {
    db,
    accountId: account.accountId,
    account: { name: account.name, email: account.email },
    now,
    startedAt: now(),
    nudge: host.nudge,
    refreshWeather: host.refreshWeather,
    refreshNow: host.refreshNow,
    photoSrc: apiPhotoSrc,
    upload: transport.upload,
    places: transport.places,
    locate: transport.locate,
    displays: transport.displays,
    photoUsage: transport.photoUsage,
    issueQr: transport.issueQr,
    voidQr: transport.voidQr,
    webPush: transport.webPush,
    imports: transport.imports,
    apiKey: transport.apiKey,
    signOut,
    signOutAll: () => thenSignOut(transport.auth.signoutAll(), signOut),
    deleteAccount: () => thenSignOut(transport.auth.deleteAccount(), signOut),
    markSignedOut: () => readMeta(markSignedOut),
    markRevoked: () => readMeta(markRevoked),
  };

  return { boot: { kind: "ready", store }, close };
}

async function thenSignOut(
  request: Promise<Result<void, TransportError>>,
  signOut: () => Promise<void>,
): Promise<Result<void, TransportError>> {
  const answer = await request;

  if (answer.ok) await signOut();

  return answer;
}
