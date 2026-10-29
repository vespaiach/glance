import type { CalendarEvent, Tag } from "@/domain/schemas";
import type { Database, StoredEvent } from "../../db";
import { putEvent } from "../events";
import { putTag } from "../tags";
import { MARIA, OMAR, START, serviceHarnessPerTest } from "../testServices";
import { commitImport, lastImport, undoImport } from "./commit";
import { stageImport } from "./stage";

const harness = serviceHarnessPerTest();

const HOUR_MS = 60 * 60 * 1000;

const WALL = "0192f3a0-0000-7000-8000-0000000000d1";

const MOM: Tag = {
  id: "0192f3a0-3333-7000-8000-000000000001",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const SWIM: CalendarEvent = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim",
  startAt: "2026-10-16T20:00:00.000Z",
  endAt: "2026-10-16T21:00:00.000Z",
  everyone: true,
  tagIds: [],
};

const FILE = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Glance//Test//EN",
  vevent("swim", "20261016T200000Z", "20261016T210000Z", "Swim"),
  vevent("piano", "20261017T150000Z", "20261017T160000Z", "Piano"),
  vevent("chess", "20261018T150000Z", "20261018T160000Z", "Chess"),
  "END:VCALENDAR",
].join("\r\n");

function vevent(uid: string, start: string, end: string, title: string): string {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    "DTSTAMP:20260901T000000Z",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    "END:VEVENT",
  ].join("\r\n");
}

async function stage(): Promise<string> {
  const review = await stageImport(harness.deps(), MARIA, WALL, {
    fileName: "school.ics",
    text: FILE,
    size: FILE.length,
  });

  if (!review.ok) throw new Error(review.error);

  return review.value.id;
}

async function liveEvents(accountId = MARIA): Promise<StoredEvent[]> {
  const events = await harness.deps().db.events.changedSince(accountId, 0);

  return events.filter((event) => !event.deletedAt);
}

function failingOnSecondEvent(db: Database): Database {
  let saves = 0;

  const failing = (tx: Database): Database => ({
    ...tx,
    events: {
      ...tx.events,
      save: async (accountId, event) => {
        saves += 1;
        if (saves === 2) throw new Error("disk full");
        await tx.events.save(accountId, event);
      },
    },
  });

  return { ...db, tx: (fn) => db.tx((tx) => fn(failing(tx))) };
}

beforeEach(async () => {
  await harness.deps().db.displays.insert({
    id: WALL,
    accountId: MARIA,
    kind: "monitor",
    browser: null,
    lastSeenAt: START.toISOString(),
  });
  await putTag(harness.deps(), MARIA, MOM);
  await putEvent(harness.deps(), MARIA, SWIM);
});

describe("commitImport", () => {
  it("IMP-08 commit adds only the new events, for the picked who, with notify on", async () => {
    const id = await stage();

    const done = await commitImport(harness.deps(), MARIA, id, MOM.id);

    expect(done.ok && { ...done.value, version: 0 }).toEqual({
      count: 2,
      range: { first: "2026-10-16", last: "2026-10-18" },
      who: MOM.id,
      version: 0,
    });
    const added = (await liveEvents()).filter((event) => event.id !== SWIM.id);
    expect(
      added.map(({ title, everyone, tagIds, notify, importId }) => ({
        title,
        everyone,
        tagIds,
        notify,
        importId,
      })),
    ).toEqual([
      { title: "Piano", everyone: false, tagIds: [MOM.id], notify: true, importId: id },
      { title: "Chess", everyone: false, tagIds: [MOM.id], notify: true, importId: id },
    ]);
  });

  it("IMP-08 commit for everyone adds events for everyone", async () => {
    const id = await stage();

    await commitImport(harness.deps(), MARIA, id, "everyone");

    const added = (await liveEvents()).filter((event) => event.importId === id);
    expect(added.map(({ everyone, tagIds }) => ({ everyone, tagIds }))).toEqual([
      { everyone: true, tagIds: [] },
      { everyone: true, tagIds: [] },
    ]);
  });

  it("IMP-08 commit adds all or nothing", async () => {
    const id = await stage();
    const { db, now } = harness.deps();

    await expect(
      commitImport({ db: failingOnSecondEvent(db), now }, MARIA, id, "everyone"),
    ).rejects.toThrow("disk full");

    expect((await liveEvents()).map((event) => event.title)).toEqual(["Swim"]);
    expect((await commitImport(harness.deps(), MARIA, id, "everyone")).ok).toBe(true);
  });

  it("IMP-08 a second commit is not-staged", async () => {
    const id = await stage();
    await commitImport(harness.deps(), MARIA, id, "everyone");

    const again = await commitImport(harness.deps(), MARIA, id, "everyone");

    expect(again).toEqual({ ok: false, error: "not-staged" });
    expect(await liveEvents()).toHaveLength(3);
  });

  it("IMP-08 commit for a tag the account doesn't have is unknown-tag", async () => {
    const id = await stage();

    const done = await commitImport(
      harness.deps(),
      MARIA,
      id,
      "0192f3a0-3333-7000-8000-000000000009",
    );

    expect(done).toEqual({ ok: false, error: "unknown-tag" });
    expect(await liveEvents()).toHaveLength(1);
  });

  it("tech§6.7 another account can't commit the import", async () => {
    const id = await stage();

    expect(await commitImport(harness.deps(), OMAR, id, "everyone")).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await liveEvents(OMAR)).toEqual([]);
    expect(await liveEvents()).toHaveLength(1);
  });
});

describe("undoImport", () => {
  it("IMP-10 undo removes every event of the import, edited ones too, and nothing else", async () => {
    const id = await stage();
    await commitImport(harness.deps(), MARIA, id, "everyone");
    const [piano] = (await liveEvents()).filter((event) => event.importId === id);
    if (!piano) throw new Error("no piano");
    await putEvent(harness.deps(), MARIA, { ...piano, title: "Piano lesson" });

    const undone = await undoImport(harness.deps(), MARIA, id);

    expect(undone.ok).toBe(true);
    expect((await liveEvents()).map((event) => event.title)).toEqual(["Swim"]);
  });

  it("IMP-10 undo after 24 h is too-late", async () => {
    const id = await stage();
    await commitImport(harness.deps(), MARIA, id, "everyone");
    harness.advance(24 * HOUR_MS);

    expect(await undoImport(harness.deps(), MARIA, id)).toEqual({ ok: false, error: "too-late" });
    expect(await liveEvents()).toHaveLength(3);
  });

  it("IMP-10 undo of an import that isn't done is not-done", async () => {
    const id = await stage();

    expect(await undoImport(harness.deps(), MARIA, id)).toEqual({ ok: false, error: "not-done" });

    await commitImport(harness.deps(), MARIA, id, "everyone");
    await undoImport(harness.deps(), MARIA, id);

    expect(await undoImport(harness.deps(), MARIA, id)).toEqual({ ok: false, error: "not-done" });
  });

  it("tech§6.7 another account can't undo the import", async () => {
    const id = await stage();
    await commitImport(harness.deps(), MARIA, id, "everyone");

    expect(await undoImport(harness.deps(), OMAR, id)).toEqual({ ok: false, error: "not-found" });
    expect(await liveEvents()).toHaveLength(3);
  });
});

describe("lastImport", () => {
  it("IMP-10 last is the newest import, with its undo deadline", async () => {
    const older = await stage();
    await commitImport(harness.deps(), MARIA, older, "everyone");
    harness.advance(HOUR_MS);
    const newer = await stage();
    await commitImport(harness.deps(), MARIA, newer, MOM.id);

    const last = await lastImport(harness.deps(), MARIA);

    const importedAt = new Date(START.getTime() + HOUR_MS).toISOString();
    expect(last).toEqual({
      ok: true,
      value: {
        id: newer,
        importedAt,
        count: 0,
        who: MOM.id,
        undoUntil: new Date(START.getTime() + 25 * HOUR_MS).toISOString(),
      },
    });
  });

  it("IMP-10 after undo there is no last import, not even an older one", async () => {
    const older = await stage();
    await commitImport(harness.deps(), MARIA, older, "everyone");
    harness.advance(HOUR_MS);
    const newer = await stage();
    await commitImport(harness.deps(), MARIA, newer, "everyone");

    await undoImport(harness.deps(), MARIA, newer);

    expect(await lastImport(harness.deps(), MARIA)).toEqual({ ok: false, error: "not-found" });
  });

  it("tech§6.7 another account's import isn't its last", async () => {
    const id = await stage();
    await commitImport(harness.deps(), MARIA, id, "everyone");

    expect(await lastImport(harness.deps(), OMAR)).toEqual({ ok: false, error: "not-found" });
  });
});
