import type { CalendarEvent } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import {
  canSave,
  draftFromEvent,
  type EventDraft,
  type EventEditState,
  type EventSheetAction,
  type EventSheetState,
  eventFromDraft,
  eventSheetReducer,
  initialEventSheet,
  isDirty,
  newEventDraft,
} from "./eventSheet";

const tz = deviceTimeZone();

const MOM = "0195f0a0-0000-7000-8000-000000000501";

const DAD = "0195f0a0-0000-7000-8000-000000000502";

const LUNCH: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  title: "Lunch with Aunt Rosa",
  startAt: new Date(2026, 9, 9, 12, 0).toISOString(),
  endAt: new Date(2026, 9, 9, 13, 0).toISOString(),
  location: "Café Lumen",
  everyone: false,
  tagIds: [MOM],
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
};

const DRAFT: EventDraft = {
  title: "Lunch",
  start: 720,
  end: 780,
  location: "Café",
  everyone: true,
  tagIds: [],
  notes: "",
};

const closed = opening(DRAFT);

function editing(state: EventSheetState): EventEditState {
  if (state.step === "details") throw new Error("expected an edit step");

  return state;
}

function reduce(state: EventSheetState, action: EventSheetAction): EventEditState {
  return editing(eventSheetReducer(state, action));
}

function opening(...args: Parameters<typeof initialEventSheet>): EventEditState {
  return editing(initialEventSheet(...args));
}

describe("event sheet drafts", () => {
  it("EVT-02 an existing event fills the draft in minutes of its day", () => {
    expect(draftFromEvent(LUNCH, tz, NOW)).toEqual({
      title: "Lunch with Aunt Rosa",
      start: 720,
      end: 780,
      location: "Café Lumen",
      everyone: false,
      tagIds: [MOM],
      notes: "Bring a gift",
    });
  });

  it("TPK-08 an event with no end leaves the draft end empty", () => {
    const { endAt: _, ...noEnd } = LUNCH;

    expect(draftFromEvent(noEnd, tz, NOW).end).toBeUndefined();
  });

  it("EVT-02 a new event is blank, for everyone, at the TPK-05 default times", () => {
    expect(newEventDraft(new Date(2026, 9, 9, 10, 41), tz)).toEqual({
      title: "",
      start: 660,
      end: 720,
      location: "",
      everyone: true,
      tagIds: [],
      notes: "",
    });
  });

  it("TL-08 a new event from a free slot starts and ends at the slot", () => {
    expect(newEventDraft(NOW, tz, undefined, { start: 675, end: 735 })).toMatchObject({
      start: 675,
      end: 735,
    });
  });

  it("EVT-11 a new event starts with the Calendar filter's tags", () => {
    expect(newEventDraft(NOW, tz, { everyone: false, tagIds: [MOM] })).toMatchObject({
      everyone: false,
      tagIds: [MOM],
    });
  });

  it("EVT-11 a new event from a filter with every tag off starts for nobody", () => {
    expect(newEventDraft(NOW, tz, { everyone: false, tagIds: [] })).toMatchObject({
      everyone: false,
      tagIds: [],
    });
  });
});

describe("event sheet fixtures", () => {
  it("tech§6 no time fixture opens with the picker closed and no errors", () => {
    expect(closed).toEqual({
      step: "editing",
      draft: DRAFT,
      picker: null,
      titleError: false,
      endError: false,
      opened: DRAFT,
      fromDetails: false,
    });
  });

  it("TPK-02 time=start and time=end open that picker", () => {
    expect(opening(DRAFT, "start").picker).toBe("start");
    expect(opening(DRAFT, "end").picker).toBe("end");
  });

  it("TPK-07 time=error ends 30 min before the start and shows the end error", () => {
    const state = opening(DRAFT, "error");

    expect(state.draft.end).toBe(690);
    expect(state.endError).toBe(true);
  });

  it("TPK-08 time=noend clears the end", () => {
    expect(opening(DRAFT, "noend").draft.end).toBeUndefined();
  });
});

describe("event sheet reducer", () => {
  it("TPK-02 tapping a field opens its picker, and tapping it again closes it", () => {
    const open = reduce(closed, { type: "toggle", field: "start" });

    expect(open.picker).toBe("start");
    expect(reduce(open, { type: "toggle", field: "start" }).picker).toBeNull();
  });

  it("TPK-02 one picker at a time", () => {
    const open = reduce(closed, { type: "toggle", field: "start" });

    expect(reduce(open, { type: "toggle", field: "end" }).picker).toBe("end");
  });

  it("TPK-04 Done closes the picker", () => {
    const open = reduce(closed, { type: "toggle", field: "end" });

    expect(reduce(open, { type: "done" }).picker).toBeNull();
  });

  it("TPK-06 a new start moves the end and keeps the length", () => {
    expect(reduce(closed, { type: "start", value: 600 }).draft).toMatchObject({
      start: 600,
      end: 660,
    });
  });

  it("TPK-04 a new end keeps the start", () => {
    expect(reduce(closed, { type: "end", value: 810 }).draft).toMatchObject({
      start: 720,
      end: 810,
    });
  });

  it("TPK-04 No end time clears the end and closes the picker", () => {
    const open = reduce(closed, { type: "toggle", field: "end" });

    const next = reduce(open, { type: "noEnd" });

    expect(next.draft.end).toBeUndefined();
    expect(next.picker).toBeNull();
  });

  it("TPK-08 tapping Ends with no end fills Starts + 1 h", () => {
    const noEnd = opening(DRAFT, "noend");

    expect(reduce(noEnd, { type: "toggle", field: "end" }).draft.end).toBe(780);
  });

  it("TPK-07 the end error clears on the next change to any field", () => {
    const error = opening(DRAFT, "error");

    expect(reduce(error, { type: "title", value: "Lunch!" }).endError).toBe(false);
    expect(reduce(error, { type: "location", value: "Park" }).endError).toBe(false);
  });

  it("EVT-03 the title error clears on the next change", () => {
    const missing = { ...closed, titleError: true };

    expect(reduce(missing, { type: "location", value: "Park" }).titleError).toBe(false);
  });

  it("EVT-02 title, where and notes edits update the draft", () => {
    const actions = [
      { type: "title", value: "Picnic" },
      { type: "location", value: "Park" },
      { type: "notes", value: "Bring a blanket" },
    ] as const;

    const next = actions.reduce<EventEditState>(reduce, closed);

    expect(next.draft).toMatchObject({
      title: "Picnic",
      location: "Park",
      notes: "Bring a blanket",
    });
  });

  it("EVT-11 a tag tap follows the Who rules", () => {
    const next = reduce(closed, { type: "tag", id: MOM, family: [DAD, MOM] });

    expect(next.draft).toMatchObject({ everyone: false, tagIds: [DAD] });
  });

  it("EVT-11 Everyone selects the whole family", () => {
    const forMom = opening({ ...DRAFT, everyone: false, tagIds: [MOM] });

    expect(reduce(forMom, { type: "everyone" }).draft).toMatchObject({
      everyone: true,
      tagIds: [],
    });
  });

  it("EVT-11 Everyone when everyone is selected leaves the sheet as it is", () => {
    const failed = reduce(opening({ ...DRAFT, title: "" }), { type: "save" });

    expect(reduce(failed, { type: "everyone" })).toBe(failed);
  });

  it("EVT-11 a Who change clears the errors", () => {
    const failed = reduce(opening({ ...DRAFT, title: "" }), { type: "save" });

    const next = reduce(failed, { type: "tag", id: MOM, family: [DAD, MOM] });

    expect(next.titleError).toBe(false);
  });

  it("EVT-06 Delete asks for the inline confirm", () => {
    expect(reduce(closed, { type: "askDelete" }).step).toBe("deleting");
  });
});

describe("event sheet save", () => {
  it("EVT-03 Save with a blank title shows Add a title", () => {
    const blank = opening({ ...DRAFT, title: "  " });

    expect(reduce(blank, { type: "save" }).titleError).toBe(true);
  });

  it("EVT-03 a title-only failure keeps the open picker", () => {
    const open = { ...opening({ ...DRAFT, title: "" }), picker: "start" as const };

    expect(reduce(open, { type: "save" }).picker).toBe("start");
  });

  it("TPK-07 Save with equal times shows the end error and closes the picker", () => {
    const equal = { ...opening({ ...DRAFT, end: 720 }), picker: "end" as const };

    const saved = reduce(equal, { type: "save" });

    expect(saved).toMatchObject({ endError: true, titleError: false, picker: null });
  });

  it("TPK-07 Save checks the title and the end together", () => {
    const both = opening({ ...DRAFT, title: "", end: 700 });

    expect(reduce(both, { type: "save" })).toMatchObject({
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
    expect(canSave(opening(DRAFT, "noend").draft)).toBe(true);
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
      everyone: true,
      tagIds: [],
    });
  });

  it("D24 the saved event keeps the opened event's tags and trimmed notes", () => {
    const draft = { ...draftFromEvent(LUNCH, tz, NOW), notes: "  Bring a gift " };

    expect(eventFromDraft(draft, DAY, ID, tz)).toMatchObject({
      everyone: false,
      tagIds: [MOM],
      notes: "Bring a gift",
    });
    expect(eventFromDraft({ ...draft, notes: " " }, DAY, ID, tz)).not.toHaveProperty("notes");
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

    expect(draftFromEvent(late, LA, NOW).start).toBe(23 * 60 + 30);
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
  const asking = reduce(reduce(closed, { type: "title", value: "Picnic" }), {
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
    ["notes", { notes: "Bring a gift" }],
    ["who", { everyone: false, tagIds: [MOM] }],
  ])("§8.9 a changed %s makes the draft dirty", (_, change) => {
    expect(isDirty({ ...DRAFT, ...change }, DRAFT)).toBe(true);
  });

  it("§8.9 spaces around the notes and the order of tags don't make the draft dirty", () => {
    const opened = { ...DRAFT, everyone: false, tagIds: [MOM, DAD], notes: "Gift" };

    expect(isDirty({ ...opened, tagIds: [DAD, MOM], notes: " Gift " }, opened)).toBe(false);
  });

  it("§8.9 the time fixtures are part of the opened draft", () => {
    const error = opening(DRAFT, "error");

    expect(isDirty(error.draft, error.opened)).toBe(false);
  });

  it("§8.9 discard=1 opens on Discard changes?", () => {
    expect(opening(DRAFT, undefined, true).step).toBe("discarding");
  });

  it("§8.9 asking to discard closes the time picker", () => {
    const open = reduce(closed, { type: "toggle", field: "start" });

    expect(reduce(open, { type: "askDiscard" })).toMatchObject({
      step: "discarding",
      picker: null,
    });
  });

  it("§8.9 asking to discard replaces a waiting delete confirm", () => {
    const deleting = reduce(closed, { type: "askDelete" });

    expect(reduce(deleting, { type: "askDiscard" }).step).toBe("discarding");
  });

  it("§8.9 Keep editing brings the footer back with the draft kept", () => {
    expect(reduce(asking, { type: "keepEditing" })).toMatchObject({
      step: "editing",
      draft: { title: "Picnic" },
    });
  });

  it.each<EventSheetAction>([
    { type: "title", value: "Picnic at noon" },
    { type: "location", value: "Park" },
    { type: "start", value: 750 },
    { type: "end", value: 800 },
    { type: "noEnd" },
  ])("§8.9 an edit ($type) brings the footer back", (action) => {
    expect(reduce(asking, action).step).toBe("editing");
  });

  it("§8.9 an edit keeps a waiting delete confirm", () => {
    const deleting = reduce(closed, { type: "askDelete" });

    expect(reduce(deleting, { type: "title", value: "Picnic" }).step).toBe("deleting");
  });
});

describe("event sheet all day", () => {
  const allDay = reduce(closed, { type: "allDay", value: true });

  it("EVT-08 an all-day event fills the draft as all day with the TPK-05 default times", () => {
    expect(draftFromEvent(NO_SCHOOL, tz, NOW)).toEqual({
      title: "No school · teacher planning day",
      start: 660,
      end: 720,
      allDay: true,
      location: "Lincoln Elementary",
      everyone: true,
      tagIds: [],
      notes: "",
    });
  });

  it("EVT-08 All day keeps the draft times and closes the open picker", () => {
    const open = reduce(closed, { type: "toggle", field: "start" });

    expect(reduce(open, { type: "allDay", value: true })).toMatchObject({
      draft: { start: 720, end: 780, allDay: true },
      picker: null,
    });
  });

  it("EVT-08 Set times restores the times the draft had", () => {
    expect(reduce(allDay, { type: "allDay", value: false }).draft).toEqual(DRAFT);
  });

  it("TPK-07 switching to All day clears the end error", () => {
    const error = opening(DRAFT, "error");

    expect(reduce(error, { type: "allDay", value: true }).endError).toBe(false);
  });

  it("TPK-07 an all-day draft skips the end check", () => {
    const backwards = { ...DRAFT, end: 600, allDay: true } as const;

    expect(canSave(backwards)).toBe(true);
    expect(reduce(opening(backwards), { type: "save" }).endError).toBe(false);
  });

  it("§8.9 switching to All day makes the draft dirty", () => {
    expect(isDirty(allDay.draft, allDay.opened)).toBe(true);
  });

  it("§8.9 switching to All day brings the footer back", () => {
    const asking = reduce(closed, { type: "askDiscard" });

    expect(reduce(asking, { type: "allDay", value: true }).step).toBe("editing");
  });

  it("D21 an all-day draft saves on its date's UTC midnight with no end", () => {
    const event = eventFromDraft(allDay.draft, "2026-10-16", NO_SCHOOL.id, "America/Los_Angeles");

    expect(event).toEqual({
      id: NO_SCHOOL.id,
      title: "Lunch",
      startAt: "2026-10-16T00:00:00.000Z",
      allDay: true,
      location: "Café",
      everyone: true,
      tagIds: [],
    });
  });
});

describe("event details", () => {
  const details = initialEventSheet(DRAFT, undefined, false, true);

  const editingFromDetails = reduce(details, { type: "edit" });

  const changed = reduce(editingFromDetails, { type: "title", value: "Picnic" });

  it("EVT-09 details=1 opens Event details with the draft as opened", () => {
    expect(details).toEqual({ step: "details", opened: DRAFT });
  });

  it("EVT-09 details=1 ignores a time picker fixture", () => {
    expect(initialEventSheet(DRAFT, "start", false, true)).toEqual({
      step: "details",
      opened: DRAFT,
    });
  });

  it("EVT-09 details ignore every action but Edit", () => {
    expect(eventSheetReducer(details, { type: "title", value: "Picnic" })).toBe(details);
  });

  it("EVT-10 Edit swaps the sheet to Edit event", () => {
    expect(editingFromDetails).toMatchObject({ step: "editing", fromDetails: true, draft: DRAFT });
  });

  it("EVT-10 going back to details drops the changes", () => {
    const open = reduce(changed, { type: "toggle", field: "start" });

    expect(eventSheetReducer(open, { type: "back" })).toEqual({ step: "details", opened: DRAFT });
  });

  it("EVT-10 going back clears the field errors", () => {
    const failed = reduce(reduce(editingFromDetails, { type: "title", value: "" }), {
      type: "save",
    });

    const back = eventSheetReducer(failed, { type: "back" });

    expect(reduce(back, { type: "edit" })).toMatchObject({ titleError: false, endError: false });
  });

  it("EVT-10 Cancel asks to discard and remembers to return to details", () => {
    expect(reduce(changed, { type: "askDiscard", to: "details" })).toMatchObject({
      step: "discarding",
      discardTo: "details",
    });
  });

  it("EVT-10 the close button asks to discard and closes afterwards", () => {
    const asking = reduce(changed, { type: "askDiscard", to: "details" });

    const kept = reduce(asking, { type: "keepEditing" });

    expect(reduce(kept, { type: "askDiscard" })).toMatchObject({ discardTo: null });
  });

  it("EVT-10 Discard from Cancel returns to details", () => {
    const asking = reduce(changed, { type: "askDiscard", to: "details" });

    expect(eventSheetReducer(asking, { type: "back" })).toEqual({ step: "details", opened: DRAFT });
  });

  it("EVT-07 Save from details returns to details with the new values", () => {
    const saved = eventSheetReducer(changed, { type: "saved" });

    expect(saved).toEqual({ step: "details", opened: { ...DRAFT, title: "Picnic" } });
    expect(reduce(saved, { type: "edit" }).draft).toEqual({ ...DRAFT, title: "Picnic" });
  });

  it("EVT-10 discard=1 with details=1 opens the edit with the prompt that returns to details", () => {
    expect(initialEventSheet(DRAFT, undefined, true, true)).toMatchObject({
      step: "discarding",
      fromDetails: true,
      discardTo: "details",
    });
  });
});
