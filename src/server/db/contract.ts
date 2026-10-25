import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Weather } from "@/domain/schemas";
import type { AccountRecord, Database, StoredEvent, StoredNote, StoredPhoto } from "./database";

const NOW = "2026-10-09T14:00:00.000Z";

const LATER = "2026-10-09T15:00:00.000Z";

const MARIA = "0192f3a0-0000-7000-8000-000000000001";

const OMAR = "0192f3a0-0000-7000-8000-000000000002";

const EVENT: StoredEvent = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim practice",
  startAt: "2026-10-10T16:00:00.000Z",
  endAt: "2026-10-10T17:00:00.000Z",
  location: "Rec center",
  everyone: false,
  tagIds: ["0192f3a0-3333-7000-8000-000000000001"],
  notify: true,
  notes: "Bring goggles",
  updatedAt: NOW,
  version: 1,
};

const NOTE: StoredNote = {
  id: "0192f3a0-2222-7000-8000-000000000001",
  text: "Milk and eggs",
  author: "Maria",
  createdAt: NOW,
  rotation: -1.5,
  updatedAt: NOW,
  version: 1,
};

const PHOTO: StoredPhoto = {
  id: "0192f3a0-4444-7000-8000-000000000001",
  title: "Beach day",
  takenOn: "2026-08-01",
  place: "Cannon Beach",
  createdAt: NOW,
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: false,
  fileName: "IMG_0001.jpg",
  updatedAt: NOW,
  version: 1,
};

export function databaseContract(open: () => Database): void {
  const db = () => open();

  beforeEach(async () => {
    await db().accounts.insert(account(MARIA, "maria@example.com"));
    await db().accounts.insert(account(OMAR, "omar@example.com"));
  });

  describe("versions and transactions", () => {
    it("tech§5 starts the version at 0 and counts up by one", async () => {
      expect(await db().versions.current()).toBe(0);
      expect(await db().versions.next()).toBe(1);
      expect(await db().versions.next()).toBe(2);
      expect(await db().versions.current()).toBe(2);
    });

    it("D7 rolls back every write in a transaction that throws", async () => {
      const failed = db().tx(async (tx) => {
        await tx.versions.next();
        await tx.notes.save(MARIA, NOTE);
        throw new Error("boom");
      });

      await expect(failed).rejects.toThrow("boom");
      expect(await db().versions.current()).toBe(0);
      expect(await db().notes.find(NOTE.id)).toBeUndefined();
    });

    it("D7 joins a nested transaction to the outer one", async () => {
      const failed = db().tx(async (tx) => {
        await tx.tx((inner) => inner.notes.save(MARIA, NOTE));
        throw new Error("boom");
      });

      await expect(failed).rejects.toThrow("boom");
      expect(await db().notes.find(NOTE.id)).toBeUndefined();
    });

    it("tech§5 runs transactions one at a time so versions commit in order", async () => {
      const seen = await Promise.all(
        [1, 2, 3, 4, 5].map(() =>
          db().tx(async (tx) => {
            const before = await tx.versions.current();
            await new Promise((resolve) => setTimeout(resolve, 5));
            return { before, next: await tx.versions.next() };
          }),
        ),
      );

      expect(seen.every(({ before, next }) => next === before + 1)).toBe(true);
      expect(seen.map(({ next }) => next).sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("accounts", () => {
    it("SIGNIN-03 finds an account by id and by email in any letter case", async () => {
      expect(await db().accounts.byId(MARIA)).toEqual(account(MARIA, "maria@example.com"));
      expect(await db().accounts.byEmail("Maria@Example.com")).toMatchObject({ id: MARIA });
      expect(await db().accounts.byEmail("nobody@example.com")).toBeUndefined();
    });

    it("SIGNIN-03 rejects a second account with the same email", async () => {
      await expect(
        db().accounts.insert(account("0192f3a0-0000-7000-8000-000000000009", "MARIA@example.com")),
      ).rejects.toThrow();
    });

    it("tech§6.2 renames an account and finishes setup only once", async () => {
      await db().accounts.rename(MARIA, "Maria");
      await db().accounts.finishSetup(MARIA, NOW);
      await db().accounts.finishSetup(MARIA, LATER);

      expect(await db().accounts.byId(MARIA)).toMatchObject({ name: "Maria", setupDoneAt: NOW });
    });
  });

  describe("displays and sessions", () => {
    it("tech§6.2 finds a session's display and account, and forgets it once removed", async () => {
      await db().displays.insert(display("d1", MARIA, NOW));
      await db().sessions.insert({ tokenHash: "h1", displayId: "d1", createdAt: NOW });

      expect(await db().sessions.find("h1")).toEqual({
        displayId: "d1",
        accountId: MARIA,
        createdAt: NOW,
      });

      await db().sessions.removeForDisplay("d1");
      await db().displays.remove("d1");

      expect(await db().sessions.find("h1")).toBeUndefined();
      expect(await db().displays.forAccount(MARIA)).toEqual([]);
    });

    it("tech§5 lists only the account's displays and records when one was last seen", async () => {
      await db().displays.insert(display("d1", MARIA, NOW));
      await db().displays.insert(display("d2", OMAR, NOW));

      await db().displays.seen("d1", LATER);

      expect(await db().displays.forAccount(MARIA)).toEqual([display("d1", MARIA, LATER)]);
    });
  });

  describe("sign-in codes and magic links", () => {
    it("SIGNIN-08 keeps one code per email, replaced by the newest, and removes expired ones", async () => {
      const code = { email: "a@x.com", codeHash: "c1", timeZone: "UTC", tries: 0, expiresAt: NOW };

      await db().signInCodes.put(code);
      await db().signInCodes.put({ ...code, codeHash: "c2", tries: 2 });
      await db().signInCodes.put({ ...code, email: "b@x.com", expiresAt: LATER });

      expect(await db().signInCodes.get("a@x.com")).toEqual({ ...code, codeHash: "c2", tries: 2 });

      await db().signInCodes.removeExpired(LATER);

      expect(await db().signInCodes.get("a@x.com")).toBeUndefined();
      expect(await db().signInCodes.get("b@x.com")).toBeDefined();

      await db().signInCodes.remove("b@x.com");

      expect(await db().signInCodes.get("b@x.com")).toBeUndefined();
    });

    it("D23 removing a display removes its QR links", async () => {
      await db().displays.insert(display("d1", MARIA, NOW));
      await db().magicLinks.insert(link("open", LATER));

      await db().displays.remove("d1");

      expect(await db().magicLinks.get("open")).toBeUndefined();
    });

    it("SIGNIN-12 marks a link used, voids only unused links of a display and removes expired ones", async () => {
      await db().displays.insert(display("d1", MARIA, NOW));
      await db().magicLinks.insert(link("used", NOW));
      await db().magicLinks.insert(link("open", NOW));
      await db().magicLinks.markUsed("used", NOW);

      await db().magicLinks.removeUnusedFor("d1");

      expect(await db().magicLinks.get("used")).toEqual({ ...link("used", NOW), usedAt: NOW });
      expect(await db().magicLinks.get("open")).toBeUndefined();

      await db().magicLinks.insert(link("late", LATER));
      await db().magicLinks.removeExpired(LATER);

      expect(await db().magicLinks.get("used")).toBeUndefined();
      expect(await db().magicLinks.get("late")).toBeDefined();

      await db().magicLinks.remove("late");

      expect(await db().magicLinks.get("late")).toBeUndefined();
    });
  });

  describe("events, notes and tags", () => {
    it("SYNC-01 round-trips an event with its owner, with and without optional fields", async () => {
      const bare = { ...EVENT, id: "e2", everyone: true, tagIds: [] };
      delete bare.endAt;
      delete bare.location;
      delete bare.notes;

      await db().events.save(MARIA, EVENT);
      await db().events.save(MARIA, { ...bare, allDay: true });

      expect(await db().events.find(EVENT.id)).toEqual({ accountId: MARIA, value: EVENT });
      expect(await db().events.find("e2")).toEqual({
        accountId: MARIA,
        value: { ...bare, allDay: true },
      });
    });

    it("NOTIF-09 keeps an event's notification off, and reads one saved without it as on", async () => {
      const { notify: _, ...older } = EVENT;

      await db().events.save(MARIA, { ...EVENT, notify: false });
      await db().events.save(MARIA, { ...older, id: "e2" });

      expect(await db().events.find(EVENT.id)).toMatchObject({ value: { notify: false } });
      expect(await db().events.find("e2")).toMatchObject({ value: { notify: true } });
    });

    it("SYNC-03 replaces an event and keeps its tombstone", async () => {
      await db().events.save(MARIA, EVENT);

      const deleted = { ...EVENT, title: "Swim", deletedAt: LATER, updatedAt: LATER, version: 2 };

      await db().events.save(MARIA, deleted);

      expect(await db().events.find(EVENT.id)).toEqual({ accountId: MARIA, value: deleted });
    });

    it("tech§5 lists changes after a version for one account only", async () => {
      await db().events.save(MARIA, EVENT);
      await db().events.save(MARIA, { ...EVENT, id: "e2", version: 2 });
      await db().events.save(OMAR, { ...EVENT, id: "e3", version: 3 });

      expect(await db().events.changedSince(MARIA, 1)).toEqual([
        { ...EVENT, id: "e2", version: 2 },
      ]);
    });

    it("NOTE-06 round-trips notes and lists live notes across accounts", async () => {
      await db().notes.save(MARIA, NOTE);
      await db().notes.save(OMAR, { ...NOTE, id: "n2", author: "" });
      await db().notes.save(MARIA, { ...NOTE, id: "n3", deletedAt: NOW });

      expect(await db().notes.find("n2")).toEqual({
        accountId: OMAR,
        value: { ...NOTE, id: "n2", author: "" },
      });
      expect(await db().notes.live()).toEqual([
        { accountId: MARIA, value: NOTE },
        { accountId: OMAR, value: { ...NOTE, id: "n2", author: "" } },
      ]);
      expect(await db().notes.changedSince(OMAR, 0)).toEqual([{ ...NOTE, id: "n2", author: "" }]);
    });

    it("FAM-05 finds live tags by id and by name in any case, in one account only", async () => {
      await db().tags.save(MARIA, tag("t1", "Leo"));
      await db().tags.save(MARIA, { ...tag("t2", "Ana"), deletedAt: NOW });
      await db().tags.save(OMAR, tag("t3", "Leo"));

      expect(await db().tags.find("t1")).toEqual({ accountId: MARIA, value: tag("t1", "Leo") });
      expect(await db().tags.liveIds(MARIA, ["t1", "t2", "t3", "t9"])).toEqual(new Set(["t1"]));
      expect(await db().tags.liveByName(MARIA, "LEO")).toEqual(tag("t1", "Leo"));
      expect(await db().tags.liveByName(MARIA, "ana")).toBeUndefined();
      expect(await db().tags.hasAny(OMAR)).toBe(true);
      expect(await db().tags.changedSince(OMAR, 0)).toEqual([tag("t3", "Leo")]);
    });

    it("FAM-05 rejects a second live tag with the same name in one account", async () => {
      await db().tags.save(MARIA, tag("t1", "Leo"));

      await expect(db().tags.save(MARIA, tag("t2", "leo"))).rejects.toThrow();
    });
  });

  describe("photos", () => {
    it("tech§6.3 finds a photo and its file only in its own account", async () => {
      await db().photos.insert(MARIA, PHOTO, `${MARIA}/${PHOTO.id}`, 100);

      expect(await db().photos.find(MARIA, PHOTO.id)).toEqual(PHOTO);
      expect(await db().photos.find(OMAR, PHOTO.id)).toBeUndefined();
      expect(await db().photos.livePath(MARIA, PHOTO.id)).toBe(`${MARIA}/${PHOTO.id}`);
      expect(await db().photos.livePath(OMAR, PHOTO.id)).toBeUndefined();
      expect(await db().photos.livePaths()).toEqual([`${MARIA}/${PHOTO.id}`]);
      expect(await db().photos.changedSince(MARIA, 0)).toEqual([PHOTO]);
    });

    it("tech§6.3 saves edits and tombstones, and lists the files of deleted photos", async () => {
      const bare = { ...PHOTO, checked: true, title: "Beach" };
      delete bare.takenOn;
      delete bare.place;
      delete bare.fileName;

      await db().photos.insert(MARIA, PHOTO, `${MARIA}/${PHOTO.id}`, 100);
      await db().photos.save(MARIA, { ...bare, fileName: "IMG_0001.jpg", deletedAt: LATER });

      expect(await db().photos.find(MARIA, PHOTO.id)).toEqual({
        ...bare,
        fileName: "IMG_0001.jpg",
        deletedAt: LATER,
      });
      expect(await db().photos.livePath(MARIA, PHOTO.id)).toBeUndefined();
      expect(await db().photos.livePaths()).toEqual([]);
      expect(await db().photos.deletedPaths()).toEqual([`${MARIA}/${PHOTO.id}`]);
    });

    it("PHOTO-13 stops listing a deleted photo's files once they are removed", async () => {
      await db().photos.insert(MARIA, { ...PHOTO, deletedAt: LATER }, `${MARIA}/${PHOTO.id}`, 100);

      await db().photos.filesRemoved(`${MARIA}/${PHOTO.id}`);

      expect(await db().photos.deletedPaths()).toEqual([]);
    });

    it("D32 sums the stored bytes of the account's live photos only", async () => {
      await db().photos.insert(MARIA, PHOTO, `${MARIA}/${PHOTO.id}`, 100);
      await db().photos.insert(MARIA, photo(2), `${MARIA}/p2`, 50);
      await db().photos.insert(MARIA, { ...photo(3), deletedAt: LATER }, `${MARIA}/p3`, 7);
      await db().photos.insert(OMAR, photo(4), `${OMAR}/p4`, 1000);

      expect(await db().photos.usage(MARIA)).toBe(150);
      expect(await db().photos.usage(OMAR)).toBe(1000);
    });

    it("D32 reads no usage for an account without photos", async () => {
      expect(await db().photos.usage(MARIA)).toBe(0);
    });

    it("D32 lists live photos stored without a size, in every account, until their size is saved", async () => {
      await db().photos.insert(MARIA, PHOTO, `${MARIA}/${PHOTO.id}`, 0);
      await db().photos.insert(OMAR, photo(2), `${OMAR}/p2`, 0);
      await db().photos.insert(MARIA, photo(3), `${MARIA}/p3`, 9);

      expect((await db().photos.unsizedPaths()).sort()).toEqual(
        [`${MARIA}/${PHOTO.id}`, `${OMAR}/p2`].sort(),
      );

      await db().photos.sized(`${MARIA}/${PHOTO.id}`, 42);

      expect(await db().photos.unsizedPaths()).toEqual([`${OMAR}/p2`]);
      expect(await db().photos.usage(MARIA)).toBe(51);
    });
  });

  describe("settings and weather", () => {
    it("SET-02 saves one settings row per account", async () => {
      const saved = { ...DEFAULT_SETTINGS, accountId: MARIA, updatedAt: NOW, version: 1 };

      await db().settings.save(saved);
      await db().settings.save({ ...saved, season: "winter", version: 2 });

      expect(await db().settings.get(MARIA)).toEqual({ ...saved, season: "winter", version: 2 });
      expect(await db().settings.get(OMAR)).toBeUndefined();
      expect(await db().settings.all()).toEqual([{ ...saved, season: "winter", version: 2 }]);
      expect(await db().settings.changedSince(MARIA, 2)).toEqual([]);
      expect(await db().settings.changedSince(OMAR, 0)).toEqual([]);
    });

    it("WX-01 caches one forecast per account", async () => {
      const entry = { location: "45.52,-122.68", weather: weather(), fetchedAt: NOW };

      await db().weatherCache.put(MARIA, entry);
      await db().weatherCache.put(MARIA, { ...entry, fetchedAt: LATER });

      expect(await db().weatherCache.get(MARIA)).toEqual({ ...entry, fetchedAt: LATER });
      expect(await db().weatherCache.get(OMAR)).toBeUndefined();
    });
  });
}

function account(id: string, email: string): AccountRecord {
  return { id, email, name: null, timeZone: "America/New_York", setupDoneAt: null, createdAt: NOW };
}

function display(id: string, accountId: string, lastSeenAt: string) {
  return { id, accountId, kind: "monitor" as const, browser: "Chrome" as const, lastSeenAt };
}

function link(tokenHash: string, expiresAt: string) {
  return { tokenHash, accountId: MARIA, displayId: "d1", expiresAt, usedAt: null };
}

function photo(n: number): StoredPhoto {
  return { ...PHOTO, id: `0192f3a0-4444-7000-8000-00000000000${n}` };
}

function tag(id: string, name: string) {
  return { id, name, color: "coral" as const, createdAt: NOW, updatedAt: NOW, version: 1 };
}

function weather(): Weather {
  return {
    location: "Portland, Oregon",
    fetchedAt: NOW,
    hours: [],
    days: [],
  } as unknown as Weather;
}
