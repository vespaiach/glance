import { cleanup, renderHook, waitFor } from "@testing-library/react";
import Dexie from "dexie";
import { vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { accountDbName, deleteGlanceDb, openGlanceDb } from "../db";
import {
  deleteMetaDb,
  markSignedOut,
  openMetaDb,
  readSignedInAccount,
  saveSignedInAccount,
} from "../meta";
import { INITIAL_STATUS, STATUS_KEY, type SyncStatus } from "../sync/status";
import { type DisplayBoot, signedOutAccount, signInAuth, useDisplayBoot } from "./session";

const ACCOUNT = {
  accountId: "0195f0a0-0000-7000-8000-00000000000a",
  name: "Maria",
  email: "maria@example.com",
};

const now = () => new Date("2026-10-09T17:41:00.000Z");

const OTHER = { id: "0195f0a0-0000-7000-8000-00000000000b", name: "Ana", email: "ana@example.com" };

const PENDING = { entity: "notes", entityId: "n1", op: "delete", attempts: 0 } as const;

afterEach(async () => {
  cleanup();

  vi.unstubAllGlobals();

  await deleteMetaDb();
  await deleteGlanceDb(accountDbName(ACCOUNT.accountId));
  await deleteGlanceDb(accountDbName(OTHER.id));
});

function stubCaches() {
  const remove = vi.fn<(name: string) => Promise<boolean>>(async () => true);

  vi.stubGlobal("caches", { delete: remove });

  return remove;
}

function stubServer() {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    if (String(input).startsWith("/api/auth/")) return new Response(null, { status: 204 });

    throw new TypeError("offline");
  });

  vi.stubGlobal("fetch", fetch);

  return fetch;
}

async function queueChange(accountId: string) {
  const db = openGlanceDb(accountDbName(accountId));

  await db.outbox.add({ ...PENDING });

  db.close();
}

async function bootSignedIn() {
  const { result } = renderHook(() => useDisplayBoot(now));

  await waitFor(() => expect(result.current.kind).toBe("ready"));

  return readyStore(result.current);
}

function readyStore(boot: DisplayBoot) {
  if (boot.kind !== "ready") throw new Error(`expected ready, got ${boot.kind}`);

  return boot.store;
}

describe("useDisplayBoot", () => {
  it("tech§4.5 a screen with no glance-meta entry is signed out", async () => {
    const { result } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("signed-out"));
  });

  it("tech§4.5 a glance-meta entry opens that account's DB", async () => {
    const meta = openMetaDb();

    await saveSignedInAccount(meta, ACCOUNT);

    meta.close();

    const { result } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    const store = readyStore(result.current);

    expect(store.accountId).toBe(ACCOUNT.accountId);
    expect(store.db.name).toBe(accountDbName(ACCOUNT.accountId));
  });

  it("SIGNIN-13 a screen signed out by the server boots to the form without syncing", async () => {
    const fetch = stubServer();

    await signIn();

    await signOutByServer();

    const { result } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("signed-out"));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("SIGNIN-13 a signed-in display marks glance-meta signed out, keeping the email", async () => {
    await signIn();

    await (await bootSignedIn()).markSignedOut();

    expect(await storedAccount()).toEqual({ ...ACCOUNT, signedOut: true });
  });

  it("SIGNIN-13 opening a signed-in display clears the halt the last session left", async () => {
    await signIn();

    const db = openGlanceDb(accountDbName(ACCOUNT.accountId));

    await db.meta.put({ key: STATUS_KEY, value: { ...INITIAL_STATUS, error: "unauthorized" } });

    db.close();

    const { result } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    const status = await readyStore(result.current).db.meta.get(STATUS_KEY);

    expect((status?.value as SyncStatus | undefined)?.error).toBeUndefined();
  });

  it("D19 a signed-in display starts syncing through the sync host", async () => {
    await signIn();

    const { result } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    const { db } = readyStore(result.current);

    await waitFor(async () => {
      const status = await db.meta.get(STATUS_KEY);

      expect((status?.value as SyncStatus | undefined)?.online).toBe(false);
    });
  });

  it("tech§3 a signed-in display shows photos from the authenticated file route", async () => {
    const meta = openMetaDb();

    await saveSignedInAccount(meta, ACCOUNT);

    meta.close();

    const { result } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    expect(readyStore(result.current).photoSrc("p1", "thumb")).toBe("/api/photos/p1/file?v=thumb");
  });

  it("tech§4.5 unmounting closes the DB it opened", async () => {
    await signIn();

    const { result, unmount } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    const store = readyStore(result.current);

    unmount();

    await waitFor(() => expect(store.db.isOpen()).toBe(false));
  });
});

async function storedAccount() {
  const meta = openMetaDb();

  const account = await readSignedInAccount(meta);

  meta.close();

  return account;
}

async function signOutByServer() {
  const meta = openMetaDb();

  await markSignedOut(meta);

  meta.close();
}

async function signIn() {
  const meta = openMetaDb();

  await saveSignedInAccount(meta, ACCOUNT);

  meta.close();
}

describe("sign out", () => {
  it("SIGNIN-11 a signed-in display signs out even when the server can't be reached", async () => {
    await signIn();

    const { result } = renderHook(() => useDisplayBoot(now));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    await readyStore(result.current).signOut();

    expect(await storedAccount()).toBeUndefined();
  });

  it("SIGNIN-11 signing out tells the server", async () => {
    const fetch = stubServer();

    await signIn();

    await (await bootSignedIn()).signOut();

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/signout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("SIGNIN-11 signing out deletes this screen's account DB with its pending changes", async () => {
    await signIn();

    await queueChange(ACCOUNT.accountId);

    const store = await bootSignedIn();

    await store.signOut();

    expect(store.db.isOpen()).toBe(false);
    expect(await Dexie.exists(accountDbName(ACCOUNT.accountId))).toBe(false);
  });

  it("tech§4.5 signing out clears the photos cache", async () => {
    const remove = stubCaches();

    await signIn();

    await (await bootSignedIn()).signOut();

    expect(remove).toHaveBeenCalledExactlyOnceWith("photos");
  });
});

describe("signInAuth", () => {
  it("tech§4.5 remembering a signed-in account writes glance-meta", async () => {
    await signInAuth().remember({
      id: ACCOUNT.accountId,
      name: "Maria",
      email: "maria@example.com",
    });

    expect(await storedAccount()).toEqual(ACCOUNT);
  });

  it("SIGNIN-13 a finished sign-in clears signed out", async () => {
    await signIn();

    await signOutByServer();

    await signInAuth().remember({
      id: ACCOUNT.accountId,
      name: "Maria",
      email: ACCOUNT.email,
    });

    expect(await storedAccount()).toEqual(ACCOUNT);
  });

  it("tech§4.2 sign-in goes to the server", async () => {
    const fetch = stubServer();

    const request = { email: "maria@example.com", timeZone: "UTC" };

    expect(await signInAuth().sendCode(request)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/code",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("SIGNIN-13 signing in as a different account deletes the old account's DB and photos", async () => {
    const remove = stubCaches();

    await signIn();

    await queueChange(ACCOUNT.accountId);

    await signInAuth().remember(OTHER);

    expect(await Dexie.exists(accountDbName(ACCOUNT.accountId))).toBe(false);
    expect(remove).toHaveBeenCalledExactlyOnceWith("photos");
    expect(await storedAccount()).toEqual({ accountId: OTHER.id, name: "Ana", email: OTHER.email });
  });

  it("SIGNIN-13 signing in again as the same account keeps its pending changes", async () => {
    const remove = stubCaches();

    await signIn();

    await queueChange(ACCOUNT.accountId);

    await signInAuth().remember({
      id: ACCOUNT.accountId,
      name: "Maria",
      email: ACCOUNT.email,
    });

    const db = openGlanceDb(accountDbName(ACCOUNT.accountId));

    expect(await db.outbox.count()).toBe(1);
    expect(remove).not.toHaveBeenCalled();

    db.close();
  });

  it("tech§4.5 Gap 5 signing in asks the browser to keep this screen's storage", async () => {
    const persist = vi.fn(async () => true);

    Object.defineProperty(navigator, "storage", { value: { persist }, configurable: true });

    await signInAuth()
      .remember(OTHER)
      .finally(() => {
        Reflect.deleteProperty(navigator, "storage");
      });

    expect(persist).toHaveBeenCalledOnce();
  });
});

describe("signedOutAccount", () => {
  it("SIGNIN-13 reads the email, the waiting count and the settings from the kept account DB", async () => {
    await signIn();

    await queueChange(ACCOUNT.accountId);
    await queueChange(ACCOUNT.accountId);

    const db = openGlanceDb(accountDbName(ACCOUNT.accountId));
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      clock: "24h",
      accountId: ACCOUNT.accountId,
      updatedAt: "2026-10-01T09:00:00.000Z",
      version: 1,
    });
    db.close();

    await signOutByServer();

    expect(await signedOutAccount()).toEqual({
      email: ACCOUNT.email,
      pending: 2,
      settings: { ...DEFAULT_SETTINGS, clock: "24h" },
    });
  });

  it("SIGNIN-13 a signed-in screen has no signed-out account", async () => {
    await signIn();

    expect(await signedOutAccount()).toBeUndefined();
  });

  it("SIGNIN-13 a screen with no glance-meta entry has no signed-out account", async () => {
    expect(await signedOutAccount()).toBeUndefined();
  });

  it("SIGNIN-13 reading it leaves no account DB behind for a signed-out entry with none", async () => {
    await signIn();

    await signOutByServer();

    expect(await signedOutAccount()).toEqual({
      email: ACCOUNT.email,
      pending: 0,
      settings: DEFAULT_SETTINGS,
    });
    expect(await Dexie.exists(accountDbName(ACCOUNT.accountId))).toBe(false);
  });
});
