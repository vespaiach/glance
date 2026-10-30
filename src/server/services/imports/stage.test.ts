import type { CalendarEvent, Tag } from "@/domain/schemas";
import { putEvent } from "../events";
import { putTag, removeTag } from "../tags";
import { MARIA, OMAR, START, serviceHarnessPerTest } from "../testServices";
import { stagedImport, stageImport } from "./stage";

const harness = serviceHarnessPerTest();

const HOUR_MS = 60 * 60 * 1000;

const WALL = "0192f3a0-0000-7000-8000-0000000000d1";

const PHONE = "0192f3a0-0000-7000-8000-0000000000d2";

const OMAR_WALL = "0192f3a0-0000-7000-8000-0000000000d3";

const SWIM: CalendarEvent = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "swim",
  startAt: "2026-10-16T20:00:00.000Z",
  endAt: "2026-10-16T21:00:00.000Z",
  everyone: true,
  tagIds: [],
};

const MOM = tag("0192f3a0-3333-7000-8000-000000000001", "Mom");

const LEO = tag("0192f3a0-3333-7000-8000-000000000002", "Leo");

const MIA = tag("0192f3a0-3333-7000-8000-000000000003", "Mia");

const FILE = calendar(
  vevent("swim", "20261016T200000Z", "20261016T210000Z", "Swim"),
  vevent("piano", "20261017T150000Z", "20261017T160000Z", "Piano"),
  vevent("piano-again", "20261017T150000Z", "20261017T160000Z", "Piano"),
);

function calendar(...events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Glance//Test//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

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

function attending(event: string, ...names: string[]): string {
  const attendees = names.map((name) => `ATTENDEE;CN=${name}:mailto:${name.trim()}@example.com`);

  return event.replace("END:VEVENT", [...attendees, "END:VEVENT"].join("\r\n"));
}

function tag(id: string, name: string): Tag {
  return { id, name, color: "coral", createdAt: "2026-10-01T15:00:00.000Z" };
}

function upload(text = FILE, forDisplay?: string) {
  return { fileName: "school.ics", text, size: text.length, ...(forDisplay && { forDisplay }) };
}

async function addDisplay(accountId: string, id: string): Promise<void> {
  await harness.deps().db.displays.insert({
    id,
    accountId,
    kind: "monitor",
    browser: null,
    lastSeenAt: START.toISOString(),
  });
}

beforeEach(async () => {
  await addDisplay(MARIA, WALL);
  await addDisplay(MARIA, PHONE);
  await addDisplay(OMAR, OMAR_WALL);
});

describe("stageImport", () => {
  it("IMP-07 the review marks events already on the calendar and repeats in the file, and newCount excludes them", async () => {
    await putEvent(harness.deps(), MARIA, SWIM);

    const review = await stageImport(harness.deps(), MARIA, WALL, upload());

    expect(review.ok && { ...review.value, id: "id" }).toEqual({
      id: "id",
      fileName: "school.ics",
      size: FILE.length,
      range: { first: "2026-10-16", last: "2026-10-17" },
      events: [
        { title: "Swim", startAt: SWIM.startAt, endAt: SWIM.endAt, duplicate: true },
        {
          title: "Piano",
          startAt: "2026-10-17T15:00:00.000Z",
          endAt: "2026-10-17T16:00:00.000Z",
          duplicate: false,
        },
        {
          title: "Piano",
          startAt: "2026-10-17T15:00:00.000Z",
          endAt: "2026-10-17T16:00:00.000Z",
          duplicate: true,
        },
      ],
      newCount: 1,
      duplicates: 2,
      matched: 0,
    });
  });

  it("IMP-07 matched counts the new events whose attendees match a live tag", async () => {
    await putEvent(harness.deps(), MARIA, SWIM);
    for (const tag of [MOM, LEO, MIA]) await putTag(harness.deps(), MARIA, tag);
    await removeTag(harness.deps(), MARIA, LEO.id);
    const text = calendar(
      attending(vevent("swim", "20261016T200000Z", "20261016T210000Z", "Swim"), "Mom"),
      attending(vevent("piano", "20261017T150000Z", "20261017T160000Z", "Piano"), "Leo"),
      attending(vevent("chess", "20261018T150000Z", "20261018T160000Z", "Chess"), " mom", "Dan"),
      vevent("art", "20261019T150000Z", "20261019T160000Z", "Art"),
    );

    const review = await stageImport(harness.deps(), MARIA, WALL, upload(text));

    expect(review.ok && review.value).toMatchObject({ newCount: 3, duplicates: 1, matched: 1 });
  });

  it("IMP-06 a .txt file is not-ics and nothing is staged", async () => {
    const answer = await stageImport(harness.deps(), MARIA, WALL, {
      fileName: "notes.txt",
      text: "Buy milk",
      size: 8,
    });

    expect(answer).toEqual({ ok: false, error: "not-ics" });
    expect(await stagedImport(harness.deps(), MARIA, WALL)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("IMP-04 a phone upload for this screen is the screen's staged import, not the phone's", async () => {
    const staged = await stageImport(harness.deps(), MARIA, PHONE, upload(FILE, WALL));

    expect(await stagedImport(harness.deps(), MARIA, WALL)).toEqual(staged);
    expect((await stagedImport(harness.deps(), MARIA, PHONE)).ok).toBe(false);
  });

  it("IMP-04 staged answers the newest staged import", async () => {
    await stageImport(harness.deps(), MARIA, WALL, upload());
    harness.advance(1000);
    const newer = await stageImport(harness.deps(), MARIA, WALL, {
      ...upload(),
      fileName: "b.ics",
    });

    expect(await stagedImport(harness.deps(), MARIA, WALL)).toEqual(newer);
  });

  it("D39 an import staged over an hour ago isn't answered", async () => {
    await stageImport(harness.deps(), MARIA, WALL, upload());
    harness.advance(HOUR_MS);

    expect((await stagedImport(harness.deps(), MARIA, WALL)).ok).toBe(false);
  });

  it("tech§6.7 another account's import can't be read or staged for its screen", async () => {
    await stageImport(harness.deps(), MARIA, WALL, upload());

    expect((await stagedImport(harness.deps(), OMAR, WALL)).ok).toBe(false);
    expect(await stageImport(harness.deps(), OMAR, OMAR_WALL, upload(FILE, WALL))).toEqual({
      ok: false,
      error: "not-found",
    });
    expect((await stagedImport(harness.deps(), MARIA, WALL)).ok).toBe(true);
  });
});
