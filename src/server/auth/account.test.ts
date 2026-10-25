import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { err } from "@/domain/result";
import type { CalendarEvent, Note, Weather } from "@/domain/schemas";
import { GB } from "@/domain/storage";
import { tempDirPerTest } from "../db/testDir";
import { putEvent } from "../services/events";
import { putNote } from "../services/notes";
import { uploadPhoto } from "../services/photos";
import { putSettings } from "../services/settings";
import { newAccount } from "../services/testServices";
import { createDiskStore } from "../storage/disk";
import type { PhotoStore } from "../storage/store";
import { deleteAccount, finishSetup, saveName } from "./account";
import { requireDisplay, type SignedInDisplay } from "./sessions";
import { authHarnessPerTest, START, signIn } from "./testAuth";

const harness = authHarnessPerTest();

const EVENT: CalendarEvent = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim lesson",
  startAt: "2026-10-09T21:00:00.000Z",
  endAt: "2026-10-09T22:00:00.000Z",
  everyone: true,
  tagIds: [],
  notify: true,
};

const NOTE: Note = {
  id: "0192f3a0-2222-7000-8000-000000000001",
  text: "Milk and eggs",
  author: "Maria",
  createdAt: "2026-10-09T13:00:00.000Z",
  rotation: -1.5,
};

const MARIA = "0192f3a0-0000-7000-8000-000000000001";

const OMAR = "0192f3a0-0000-7000-8000-000000000002";

async function addAccounts(): Promise<void> {
  await harness.deps().db.accounts.insert(newAccount(MARIA, "maria@example.com"));
  await harness.deps().db.accounts.insert(newAccount(OMAR, "omar@example.com"));
}

const setupDoneAt = async (accountId: string) =>
  (await harness.deps().db.accounts.byId(accountId))?.setupDoneAt;

describe("finishSetup", () => {
  it("SIGNIN-14 records when the account's first setup ended", async () => {
    await addAccounts();
    harness.advance(60_000);

    await finishSetup(harness.deps(), MARIA);

    expect(await setupDoneAt(MARIA)).toBe("2026-10-09T14:01:00.000Z");
  });

  it("SIGNIN-14 keeps the first end when the step ends again", async () => {
    await addAccounts();
    await finishSetup(harness.deps(), MARIA);
    harness.advance(60_000);

    await finishSetup(harness.deps(), MARIA);

    expect(await setupDoneAt(MARIA)).toBe(START.toISOString());
  });

  it("tech§5 ends only its own account's setup", async () => {
    await addAccounts();

    await finishSetup(harness.deps(), MARIA);

    expect(await setupDoneAt(OMAR)).toBeNull();
  });
});

const photosDir = tempDirPerTest();

function store(): PhotoStore {
  return createDiskStore(photosDir());
}

function deleteDeps() {
  return { ...harness.deps(), store: store() };
}

function storedFiles(accountId: string): string[] {
  const dir = path.join(photosDir(), accountId);

  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

async function fillAccount(email: string): Promise<SignedInDisplay & { sessionToken: string }> {
  const display = await signIn(harness, email);
  const deps = harness.deps();
  const { db } = deps;

  await saveName(deps, display.accountId, "Maria");
  const event = await putEvent(deps, display.accountId, { ...EVENT, id: randomUUID() });
  if (!event.ok) throw new Error(event.error);
  await db.reminderSends.insert(
    [{ eventId: event.value.id, kind: "15min", fireAt: EVENT.startAt }],
    START.toISOString(),
  );
  await putNote(deps, display.accountId, { ...NOTE, id: randomUUID() });
  await putSettings(deps, display.accountId, display.accountId, DEFAULT_SETTINGS);
  await db.weatherCache.put(display.accountId, {
    location: "45.52,-122.68",
    weather: { location: "Portland, Oregon", hours: [], days: [] } as unknown as Weather,
    fetchedAt: START.toISOString(),
  });
  await db.pushSubscriptions.save({
    id: `https://push.example.com/${display.displayId}`,
    accountId: display.accountId,
    displayId: display.displayId,
    endpoint: `https://push.example.com/${display.displayId}`,
    keys: { p256dh: "p256dh-key", auth: "auth-secret" },
    createdAt: START.toISOString(),
  });
  await addPhoto(display.accountId);
  await addPhoto(display.accountId, { deleted: true });

  return display;
}

async function addPhoto(accountId: string, { deleted = false } = {}): Promise<void> {
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#c84" } })
    .jpeg()
    .toBuffer();

  const photoDeps = { ...deleteDeps(), locator: { placeAt: vi.fn() }, storageLimit: GB };

  const uploaded = await uploadPhoto(photoDeps, accountId, {
    name: "Beach.jpg",
    type: "image/jpeg",
    size: bytes.length,
    body: Readable.from([bytes]),
  });

  if (!uploaded.ok) throw new Error(uploaded.error);

  if (deleted)
    await harness
      .deps()
      .db.photos.save(accountId, { ...uploaded.value, deletedAt: START.toISOString() });
}

async function savedRows(accountId: string) {
  const { db } = harness.deps();

  return {
    account: await db.accounts.byId(accountId),
    events: await db.events.changedSince(accountId, 0),
    notes: await db.notes.changedSince(accountId, 0),
    tags: await db.tags.changedSince(accountId, 0),
    photos: await db.photos.changedSince(accountId, 0),
    settings: await db.settings.get(accountId),
    weather: await db.weatherCache.get(accountId),
    displays: await db.displays.forAccount(accountId),
    push: await db.pushSubscriptions.forAccount(accountId),
  };
}

describe("deleteAccount", () => {
  it("SET-14 erases the account's events, notes, photos, family members, settings, screens and push subscriptions", async () => {
    const maria = await fillAccount("maria@example.com");

    await deleteAccount(deleteDeps(), maria.accountId);

    expect(await savedRows(maria.accountId)).toEqual({
      account: undefined,
      events: [],
      notes: [],
      tags: [],
      photos: [],
      settings: undefined,
      weather: undefined,
      displays: [],
      push: [],
    });
  });

  it("tech§5 leaves another account's rows untouched", async () => {
    const maria = await fillAccount("maria@example.com");
    const omar = await fillAccount("omar@example.com");
    const before = await savedRows(omar.accountId);

    await deleteAccount(deleteDeps(), maria.accountId);

    expect(await savedRows(omar.accountId)).toEqual(before);
    expect((await requireDisplay(harness.deps(), omar.sessionToken)).ok).toBe(true);
  });

  it("SET-14 removes the account's stored photo files and keeps another's", async () => {
    const maria = await fillAccount("maria@example.com");
    const omar = await fillAccount("omar@example.com");

    await deleteAccount(deleteDeps(), maria.accountId);

    expect(storedFiles(maria.accountId)).toEqual([]);
    expect(storedFiles(omar.accountId)).toHaveLength(4);
    expect(await harness.deps().db.photos.cleanupPaths()).toEqual([]);
  });

  it("SET-14 files that fail to remove stay listed for the daily job", async () => {
    const maria = await fillAccount("maria@example.com");
    const failing = { ...store(), remove: vi.fn(async () => Promise.reject(new Error("down"))) };
    vi.spyOn(console, "error").mockImplementation(() => {});

    await deleteAccount({ ...harness.deps(), store: failing }, maria.accountId);

    expect(await savedRows(maria.accountId)).toMatchObject({ account: undefined, photos: [] });
    expect(await harness.deps().db.photos.cleanupPaths()).toHaveLength(2);
  });

  it("SIGNIN-18 every screen of the deleted account is refused as revoked", async () => {
    const kitchen = await fillAccount("maria@example.com");
    const hall = await signIn(harness, "maria@example.com");

    await deleteAccount(deleteDeps(), kitchen.accountId);

    expect(await requireDisplay(harness.deps(), kitchen.sessionToken)).toEqual(err("revoked"));
    expect(await requireDisplay(harness.deps(), hall.sessionToken)).toEqual(err("revoked"));
  });

  it("SIGNIN-12 the same email later signs in to a fresh, empty account", async () => {
    const maria = await fillAccount("maria@example.com");
    await deleteAccount(deleteDeps(), maria.accountId);

    const again = await signIn(harness, "maria@example.com");

    expect(again.accountId).not.toBe(maria.accountId);
    expect(await savedRows(again.accountId)).toMatchObject({
      account: { email: "maria@example.com", name: null },
      events: [],
      notes: [],
      tags: [],
      photos: [],
    });
  });
});
