import type { CalendarEvent } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import {
  draftFromEvent,
  type EventDraft,
  eventFromDraft,
  isDirty,
  newEventDraft,
} from "./eventDraft";

const tz = deviceTimeZone();

const MOM = "0195f0a0-0000-7000-8000-000000000501";

const DAD = "0195f0a0-0000-7000-8000-000000000502";

const FAMILY = [MOM, DAD];

const LUNCH: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  title: "Lunch with Aunt Rosa",
  startAt: new Date(2026, 9, 9, 12, 0).toISOString(),
  endAt: new Date(2026, 9, 9, 13, 0).toISOString(),
  location: "Café Lumen",
  everyone: false,
  tagIds: [MOM],
  notify: true,
  notes: "Bring a gift",
};

const NOW = new Date(2026, 9, 9, 10, 41);

const NO_SCHOOL: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000010",
  title: "No school · teacher planning day",
  startAt: "2026-10-16T00:00:00.000Z",
  allDay: true,
  location: "Lincoln Elementary",
  everyone: true,
  tagIds: [],
  notify: true,
};

const DRAFT: EventDraft = {
  title: "Lunch",
  start: 720,
  end: 780,
  location: "Café",
  tagIds: [MOM, DAD],
  notes: "",
  notify: true,
};

describe("event drafts", () => {
  it("EVT-02 an existing event fills the draft in minutes of its day", () => {
    expect(draftFromEvent(LUNCH, tz, NOW, FAMILY)).toEqual({
      title: "Lunch with Aunt Rosa",
      start: 720,
      end: 780,
      location: "Café Lumen",
      tagIds: [MOM],
      notes: "Bring a gift",
      notify: true,
    });
  });

  it("TPK-08 an event with no end leaves the draft end empty", () => {
    const { endAt: _, ...noEnd } = LUNCH;

    expect(draftFromEvent(noEnd, tz, NOW, FAMILY).end).toBeUndefined();
  });

  it("EVT-02 a new event is blank at the TPK-05 default times", () => {
    expect(newEventDraft(new Date(2026, 9, 9, 10, 41), tz, FAMILY)).toEqual({
      title: "",
      start: 660,
      end: 720,
      location: "",
      tagIds: FAMILY,
      notes: "",
      notify: true,
    });
  });

  it("NOTIF-09 a new event starts with its notification on", () => {
    expect(newEventDraft(NOW, tz, FAMILY).notify).toBe(true);
  });

  it("NOTIF-09 an existing event opens with its own notification, missing reading on", () => {
    expect(draftFromEvent({ ...LUNCH, notify: false }, tz, NOW, FAMILY).notify).toBe(false);

    const { notify: _, ...older } = LUNCH;

    expect(draftFromEvent(older, tz, NOW, FAMILY).notify).toBe(true);
  });

  it("EVT-11 an everyone event opens with every tag on it", () => {
    expect(draftFromEvent(NO_SCHOOL, tz, NOW, FAMILY).tagIds).toEqual(FAMILY);
  });

  it("TL-08 a new event from a free slot starts and ends at the slot", () => {
    expect(newEventDraft(NOW, tz, FAMILY, { start: 675, end: 735 })).toMatchObject({
      start: 675,
      end: 735,
    });
  });

  it("EVT-11 a new event starts with the given tags", () => {
    expect(newEventDraft(NOW, tz, [MOM]).tagIds).toEqual([MOM]);
  });
});

describe("event from draft", () => {
  const DAY = "2026-10-12";

  const ID = "0195f0a0-0000-7000-8000-000000000009";

  it("EVT-07 the saved event places the draft times on the sheet's day", () => {
    expect(eventFromDraft(DRAFT, DAY, ID, tz, FAMILY)).toEqual({
      id: ID,
      title: "Lunch",
      startAt: new Date(2026, 9, 12, 12, 0).toISOString(),
      endAt: new Date(2026, 9, 12, 13, 0).toISOString(),
      location: "Café",
      everyone: true,
      tagIds: [],
      notify: true,
    });
  });

  it("EVT-14 editing a weekly series saves it weekly, and a one-off stays one-off", () => {
    const series = draftFromEvent({ ...LUNCH, repeat: "weekly" }, tz, NOW, FAMILY);

    expect(eventFromDraft(series, DAY, ID, tz, FAMILY).repeat).toBe("weekly");
    expect(eventFromDraft(DRAFT, DAY, ID, tz, FAMILY)).not.toHaveProperty("repeat");
  });

  it("EVT-14 editing a series keeps its exception dates, and making it one-off drops them", () => {
    const series = draftFromEvent(
      { ...LUNCH, repeat: "weekly", exdates: ["2026-10-16"] },
      tz,
      NOW,
      FAMILY,
    );

    const { repeat: _, ...oneOff } = series;

    expect(eventFromDraft(series, DAY, ID, tz, FAMILY).exdates).toEqual(["2026-10-16"]);
    expect(eventFromDraft(oneOff, DAY, ID, tz, FAMILY)).not.toHaveProperty("exdates");
  });

  it("NOTIF-09 the saved event keeps the draft's notification", () => {
    expect(eventFromDraft({ ...DRAFT, notify: false }, DAY, ID, tz, FAMILY).notify).toBe(false);
  });

  it("D24 the saved event keeps the opened event's tags and trimmed notes", () => {
    const draft = { ...draftFromEvent(LUNCH, tz, NOW, FAMILY), notes: "  Bring a gift " };

    expect(eventFromDraft(draft, DAY, ID, tz, FAMILY)).toMatchObject({
      everyone: false,
      tagIds: [MOM],
      notes: "Bring a gift",
    });
    expect(eventFromDraft({ ...draft, notes: " " }, DAY, ID, tz, FAMILY)).not.toHaveProperty(
      "notes",
    );
  });

  it("EVT-07 the saved event trims the title and Where and drops a blank Where", () => {
    const event = eventFromDraft(
      { ...DRAFT, title: " Picnic ", location: "  " },
      DAY,
      ID,
      tz,
      FAMILY,
    );

    expect(event.title).toBe("Picnic");
    expect(event).not.toHaveProperty("location");
  });

  it("TPK-08 a draft with no end saves no endAt", () => {
    const { end: _, ...noEnd } = DRAFT;

    expect(eventFromDraft(noEnd, DAY, ID, tz, FAMILY)).not.toHaveProperty("endAt");
  });

  it("EVT-11 a draft with some tags saves those tags", () => {
    expect(eventFromDraft({ ...DRAFT, tagIds: [DAD] }, DAY, ID, tz, FAMILY)).toMatchObject({
      everyone: false,
      tagIds: [DAD],
    });
  });

  it("EVT-11 a draft with no tag saves nobody", () => {
    expect(eventFromDraft({ ...DRAFT, tagIds: [] }, DAY, ID, tz, FAMILY)).toMatchObject({
      everyone: false,
      tagIds: [],
    });
  });
});

describe("event drafts in a zone", () => {
  const LA = "America/Los_Angeles";

  it("LOC-06 an existing event fills the draft in minutes of its day in the given zone", () => {
    const late = { ...LUNCH, startAt: "2026-10-10T06:30:00.000Z", endAt: undefined };

    expect(draftFromEvent(late, LA, NOW, FAMILY).start).toBe(23 * 60 + 30);
  });

  it("LOC-06 the saved event places the draft times on the day in the given zone", () => {
    const event = eventFromDraft(
      DRAFT,
      "2026-10-12",
      "0195f0a0-0000-7000-8000-000000000009",
      LA,
      FAMILY,
    );

    expect(event.startAt).toBe("2026-10-12T19:00:00.000Z");
    expect(event.endAt).toBe("2026-10-12T20:00:00.000Z");
  });

  it("LOC-06 a new event's default times read the given zone", () => {
    expect(newEventDraft(new Date("2026-10-09T17:41:00Z"), LA, FAMILY)).toMatchObject({
      start: 660,
      end: 720,
    });
  });
});

describe("draft changes", () => {
  it("§8.9 the opened draft is not dirty", () => {
    expect(isDirty(DRAFT, DRAFT)).toBe(false);
  });

  it("§8.9 spaces around the title and place don't make the draft dirty", () => {
    expect(isDirty({ ...DRAFT, title: " Lunch ", location: "Café  " }, DRAFT)).toBe(false);
  });

  it.each<[string, Partial<EventDraft>]>([
    ["title", { title: "Picnic" }],
    ["start", { start: 730 }],
    ["end", { end: 790 }],
    ["no end", { end: undefined }],
    ["place", { location: "Park" }],
    ["notes", { notes: "Bring a gift" }],
    ["who", { tagIds: [MOM] }],
    ["notification", { notify: false }],
    ["all day", { allDay: true }],
  ])("§8.9 a changed %s makes the draft dirty", (_, change) => {
    expect(isDirty({ ...DRAFT, ...change }, DRAFT)).toBe(true);
  });

  it("§8.9 spaces around the notes and the order of tags don't make the draft dirty", () => {
    const opened = { ...DRAFT, tagIds: [MOM, DAD], notes: "Gift" };

    expect(isDirty({ ...opened, tagIds: [DAD, MOM], notes: " Gift " }, opened)).toBe(false);
  });
});

describe("all-day drafts", () => {
  it("EVT-08 an all-day event fills the draft as all day with the TPK-05 default times", () => {
    expect(draftFromEvent(NO_SCHOOL, tz, NOW, FAMILY)).toEqual({
      title: "No school · teacher planning day",
      start: 660,
      end: 720,
      allDay: true,
      location: "Lincoln Elementary",
      tagIds: FAMILY,
      notes: "",
      notify: true,
    });
  });

  it("D21 an all-day draft saves on its date's UTC midnight with no end", () => {
    const event = eventFromDraft(
      { ...DRAFT, allDay: true },
      "2026-10-16",
      NO_SCHOOL.id,
      "America/Los_Angeles",
      FAMILY,
    );

    expect(event).toEqual({
      id: NO_SCHOOL.id,
      title: "Lunch",
      startAt: "2026-10-16T00:00:00.000Z",
      allDay: true,
      location: "Café",
      everyone: true,
      tagIds: [],
      notify: true,
    });
  });
});
