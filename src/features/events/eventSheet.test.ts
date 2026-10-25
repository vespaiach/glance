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
      whoInput: "",
      newColor: null,
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

  it("EVT-11 removing a tag takes only that pill off", () => {
    expect(reduce(closed, { type: "removeTag", id: MOM }).draft.tagIds).toEqual([DAD]);
  });

  it("EVT-11 removing the last tag leaves nobody", () => {
    const forMom = opening({ ...DRAFT, tagIds: [MOM] });

    expect(reduce(forMom, { type: "removeTag", id: MOM }).draft.tagIds).toEqual([]);
  });

  it("EVT-11 clearing the tags leaves nobody", () => {
    expect(reduce(closed, { type: "clearTags" }).draft.tagIds).toEqual([]);
  });

  it("EVT-11 adding a tag puts its pill last and clears the input", () => {
    const typing = reduce(opening({ ...DRAFT, tagIds: [DAD] }), { type: "whoInput", value: "mo" });

    expect(reduce(typing, { type: "addTag", id: MOM })).toMatchObject({
      draft: { tagIds: [DAD, MOM] },
      whoInput: "",
    });
  });

  it("EVT-11 adding a tag already on the event keeps one pill and clears the input", () => {
    const typing = reduce(closed, { type: "whoInput", value: "Mom" });

    expect(reduce(typing, { type: "addTag", id: MOM })).toMatchObject({
      draft: { tagIds: [MOM, DAD] },
      whoInput: "",
    });
  });

  it("EVT-11 typing in Who keeps the errors and doesn't make the draft dirty", () => {
    const failed = reduce(opening({ ...DRAFT, title: "" }), { type: "save" });

    const next = reduce(failed, { type: "whoInput", value: "Gr" });

    expect(next).toMatchObject({ whoInput: "Gr", titleError: true });
    expect(isDirty(next.draft, next.opened)).toBe(false);
  });

  it("EVT-11 a Who change clears the errors", () => {
    const failed = reduce(opening({ ...DRAFT, title: "" }), { type: "save" });

    const next = reduce(failed, { type: "removeTag", id: MOM });

    expect(next.titleError).toBe(false);
  });

  it("FAM-04 a picked swatch is the new tag's color until a tag is added", () => {
    const picked = reduce(closed, { type: "newColor", color: "sage" });

    expect(picked.newColor).toBe("sage");
    expect(reduce(picked, { type: "addTag", id: MOM }).newColor).toBeNull();
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

describe("event sheet in a zone", () => {
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

describe("event sheet notification", () => {
  it("NOTIF-09 turning the notification off changes the draft", () => {
    expect(reduce(closed, { type: "notify", value: false }).draft.notify).toBe(false);
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
    ["who", { tagIds: [MOM] }],
    ["notification", { notify: false }],
  ])("§8.9 a changed %s makes the draft dirty", (_, change) => {
    expect(isDirty({ ...DRAFT, ...change }, DRAFT)).toBe(true);
  });

  it("§8.9 spaces around the notes and the order of tags don't make the draft dirty", () => {
    const opened = { ...DRAFT, tagIds: [MOM, DAD], notes: "Gift" };

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
    const event = eventFromDraft(
      allDay.draft,
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
