import type { CalendarEvent } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import {
  canSave,
  draftFromEvent,
  type EventDraft,
  type EventSheetAction,
  type EventSheetState,
  eventFromDraft,
  eventSheetReducer,
  eventSwatches,
  initialEventSheet,
  isDirty,
  newEventDraft,
} from "./eventSheet";

const tz = deviceTimeZone();

const LUNCH: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  title: "Lunch with Aunt Rosa",
  startAt: new Date(2026, 9, 9, 12, 0).toISOString(),
  endAt: new Date(2026, 9, 9, 13, 0).toISOString(),
  location: "Café Lumen",
  tone: 2,
};

const DRAFT = { title: "Lunch", start: 720, end: 780, location: "Café", tone: 2 } as const;

const closed: EventSheetState = initialEventSheet(DRAFT);

describe("event sheet drafts", () => {
  it("EVT-02 an existing event fills the draft in minutes of its day", () => {
    expect(draftFromEvent(LUNCH, tz)).toEqual({
      title: "Lunch with Aunt Rosa",
      start: 720,
      end: 780,
      location: "Café Lumen",
      tone: 2,
    });
  });

  it("TPK-08 an event with no end leaves the draft end empty", () => {
    const { endAt: _, ...noEnd } = LUNCH;

    expect(draftFromEvent(noEnd, tz).end).toBeUndefined();
  });

  it("EVT-02 a new event is blank with color 1 and the TPK-05 default times", () => {
    expect(newEventDraft(new Date(2026, 9, 9, 10, 41), tz)).toEqual({
      title: "",
      start: 660,
      end: 720,
      location: "",
      tone: 1,
    });
  });

  it("EVT-02 the swatches are the five season colors plus Alert", () => {
    expect(eventSwatches("fall")).toEqual([
      { value: 1, label: "Amber" },
      { value: 2, label: "Rust" },
      { value: 3, label: "Sage" },
      { value: 4, label: "Coral" },
      { value: "soft", label: "Cream" },
      { value: "accent", label: "Alert" },
    ]);
  });
});

describe("event sheet fixtures", () => {
  it("tech§6 no time fixture opens with the picker closed and no errors", () => {
    expect(closed).toEqual({
      draft: DRAFT,
      picker: null,
      titleError: false,
      endError: false,
      confirm: null,
      opened: DRAFT,
    });
  });

  it("TPK-02 time=start and time=end open that picker", () => {
    expect(initialEventSheet(DRAFT, "start").picker).toBe("start");
    expect(initialEventSheet(DRAFT, "end").picker).toBe("end");
  });

  it("TPK-07 time=error ends 30 min before the start and shows the end error", () => {
    const state = initialEventSheet(DRAFT, "error");

    expect(state.draft.end).toBe(690);
    expect(state.endError).toBe(true);
  });

  it("TPK-08 time=noend clears the end", () => {
    expect(initialEventSheet(DRAFT, "noend").draft.end).toBeUndefined();
  });
});

describe("event sheet reducer", () => {
  it("TPK-02 tapping a field opens its picker, and tapping it again closes it", () => {
    const open = eventSheetReducer(closed, { type: "toggle", field: "start" });

    expect(open.picker).toBe("start");
    expect(eventSheetReducer(open, { type: "toggle", field: "start" }).picker).toBeNull();
  });

  it("TPK-02 one picker at a time", () => {
    const open = eventSheetReducer(closed, { type: "toggle", field: "start" });

    expect(eventSheetReducer(open, { type: "toggle", field: "end" }).picker).toBe("end");
  });

  it("TPK-04 Done closes the picker", () => {
    const open = eventSheetReducer(closed, { type: "toggle", field: "end" });

    expect(eventSheetReducer(open, { type: "done" }).picker).toBeNull();
  });

  it("TPK-06 a new start moves the end and keeps the length", () => {
    expect(eventSheetReducer(closed, { type: "start", value: 600 }).draft).toMatchObject({
      start: 600,
      end: 660,
    });
  });

  it("TPK-04 a new end keeps the start", () => {
    expect(eventSheetReducer(closed, { type: "end", value: 810 }).draft).toMatchObject({
      start: 720,
      end: 810,
    });
  });

  it("TPK-04 No end time clears the end and closes the picker", () => {
    const open = eventSheetReducer(closed, { type: "toggle", field: "end" });

    const next = eventSheetReducer(open, { type: "noEnd" });

    expect(next.draft.end).toBeUndefined();
    expect(next.picker).toBeNull();
  });

  it("TPK-08 tapping Ends with no end fills Starts + 1 h", () => {
    const noEnd = initialEventSheet(DRAFT, "noend");

    expect(eventSheetReducer(noEnd, { type: "toggle", field: "end" }).draft.end).toBe(780);
  });

  it("TPK-07 the end error clears on the next change to any field", () => {
    const error = initialEventSheet(DRAFT, "error");

    expect(eventSheetReducer(error, { type: "title", value: "Lunch!" }).endError).toBe(false);
    expect(eventSheetReducer(error, { type: "tone", value: 3 }).endError).toBe(false);
  });

  it("EVT-03 the title error clears on the next change", () => {
    const missing = { ...closed, titleError: true };

    expect(eventSheetReducer(missing, { type: "location", value: "Park" }).titleError).toBe(false);
  });

  it("EVT-02 title, where and color edits update the draft", () => {
    const actions = [
      { type: "title", value: "Picnic" },
      { type: "location", value: "Park" },
      { type: "tone", value: "accent" },
    ] as const;

    const next = actions.reduce(eventSheetReducer, closed);

    expect(next.draft).toMatchObject({ title: "Picnic", location: "Park", tone: "accent" });
  });

  it("EVT-06 Delete asks for the inline confirm", () => {
    expect(eventSheetReducer(closed, { type: "askDelete" }).confirm).toBe("delete");
  });
});

describe("event sheet save", () => {
  it("EVT-03 Save with a blank title shows Add a title", () => {
    const blank = initialEventSheet({ ...DRAFT, title: "  " });

    expect(eventSheetReducer(blank, { type: "save" }).titleError).toBe(true);
  });

  it("EVT-03 a title-only failure keeps the open picker", () => {
    const open = { ...initialEventSheet({ ...DRAFT, title: "" }), picker: "start" as const };

    expect(eventSheetReducer(open, { type: "save" }).picker).toBe("start");
  });

  it("TPK-07 Save with equal times shows the end error and closes the picker", () => {
    const equal = { ...initialEventSheet({ ...DRAFT, end: 720 }), picker: "end" as const };

    const saved = eventSheetReducer(equal, { type: "save" });

    expect(saved).toMatchObject({ endError: true, titleError: false, picker: null });
  });

  it("TPK-07 Save checks the title and the end together", () => {
    const both = initialEventSheet({ ...DRAFT, title: "", end: 700 });

    expect(eventSheetReducer(both, { type: "save" })).toMatchObject({
      titleError: true,
      endError: true,
    });
  });

  it("TPK-07 a titled draft that ends after it starts can be saved", () => {
    expect(canSave(DRAFT)).toBe(true);
    expect(canSave({ ...DRAFT, title: " " })).toBe(false);
    expect(canSave({ ...DRAFT, end: DRAFT.start })).toBe(false);
  });

  it("TPK-08 a draft with no end passes the end check", () => {
    expect(canSave(initialEventSheet(DRAFT, "noend").draft)).toBe(true);
  });
});

describe("event from draft", () => {
  const DAY = "2026-10-12";

  const ID = "0195f0a0-0000-7000-8000-000000000009";

  it("EVT-07 the saved event places the draft times on the sheet's day", () => {
    expect(eventFromDraft(DRAFT, DAY, ID, tz)).toEqual({
      id: ID,
      title: "Lunch",
      startAt: new Date(2026, 9, 12, 12, 0).toISOString(),
      endAt: new Date(2026, 9, 12, 13, 0).toISOString(),
      location: "Café",
      tone: 2,
    });
  });

  it("EVT-07 the saved event trims the title and Where and drops a blank Where", () => {
    const event = eventFromDraft({ ...DRAFT, title: " Picnic ", location: "  " }, DAY, ID, tz);

    expect(event.title).toBe("Picnic");
    expect(event).not.toHaveProperty("location");
  });

  it("TPK-08 a draft with no end saves no endAt", () => {
    const { end: _, ...noEnd } = DRAFT;

    expect(eventFromDraft(noEnd, DAY, ID, tz)).not.toHaveProperty("endAt");
  });
});

describe("event sheet in a zone", () => {
  const LA = "America/Los_Angeles";

  it("LOC-06 an existing event fills the draft in minutes of its day in the given zone", () => {
    const late = { ...LUNCH, startAt: "2026-10-10T06:30:00.000Z", endAt: undefined };

    expect(draftFromEvent(late, LA).start).toBe(23 * 60 + 30);
  });

  it("LOC-06 the saved event places the draft times on the day in the given zone", () => {
    const event = eventFromDraft(DRAFT, "2026-10-12", "0195f0a0-0000-7000-8000-000000000009", LA);

    expect(event.startAt).toBe("2026-10-12T19:00:00.000Z");
    expect(event.endAt).toBe("2026-10-12T20:00:00.000Z");
  });

  it("LOC-06 a new event's default times read the given zone", () => {
    expect(newEventDraft(new Date("2026-10-09T17:41:00Z"), LA)).toMatchObject({
      start: 660,
      end: 720,
    });
  });
});

describe("event sheet discard", () => {
  const asking = eventSheetReducer(eventSheetReducer(closed, { type: "title", value: "Picnic" }), {
    type: "askDiscard",
  });

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
    ["color", { tone: "accent" }],
  ])("§8.9 a changed %s makes the draft dirty", (_, change) => {
    expect(isDirty({ ...DRAFT, ...change }, DRAFT)).toBe(true);
  });

  it("§8.9 the time fixtures are part of the opened draft", () => {
    const error = initialEventSheet(DRAFT, "error");

    expect(isDirty(error.draft, error.opened)).toBe(false);
  });

  it("§8.9 discard=1 opens on Discard changes?", () => {
    expect(initialEventSheet(DRAFT, undefined, true).confirm).toBe("discard");
  });

  it("§8.9 asking to discard closes the time picker", () => {
    const open = eventSheetReducer(closed, { type: "toggle", field: "start" });

    expect(eventSheetReducer(open, { type: "askDiscard" })).toMatchObject({
      confirm: "discard",
      picker: null,
    });
  });

  it("§8.9 asking to discard replaces a waiting delete confirm", () => {
    const deleting = eventSheetReducer(closed, { type: "askDelete" });

    expect(eventSheetReducer(deleting, { type: "askDiscard" }).confirm).toBe("discard");
  });

  it("§8.9 Keep editing brings the footer back with the draft kept", () => {
    expect(eventSheetReducer(asking, { type: "keepEditing" })).toMatchObject({
      confirm: null,
      draft: { title: "Picnic" },
    });
  });

  it.each<EventSheetAction>([
    { type: "title", value: "Picnic at noon" },
    { type: "location", value: "Park" },
    { type: "tone", value: 3 },
    { type: "start", value: 750 },
    { type: "end", value: 800 },
    { type: "noEnd" },
  ])("§8.9 an edit ($type) brings the footer back", (action) => {
    expect(eventSheetReducer(asking, action).confirm).toBeNull();
  });

  it("§8.9 an edit keeps a waiting delete confirm", () => {
    const deleting = eventSheetReducer(closed, { type: "askDelete" });

    expect(eventSheetReducer(deleting, { type: "title", value: "Picnic" }).confirm).toBe("delete");
  });
});
