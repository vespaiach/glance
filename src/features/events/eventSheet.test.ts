import type { CalendarEvent } from "@/domain/schemas";
import {
  draftFromEvent,
  type EventSheetState,
  eventSheetReducer,
  eventSwatches,
  initialEventSheet,
  newEventDraft,
} from "./eventSheet";

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
    expect(draftFromEvent(LUNCH)).toEqual({
      title: "Lunch with Aunt Rosa",
      start: 720,
      end: 780,
      location: "Café Lumen",
      tone: 2,
    });
  });

  it("TPK-08 an event with no end leaves the draft end empty", () => {
    const { endAt: _, ...noEnd } = LUNCH;

    expect(draftFromEvent(noEnd).end).toBeUndefined();
  });

  it("EVT-02 a new event is blank with color 1 and the TPK-05 default times", () => {
    expect(newEventDraft(new Date(2026, 9, 9, 10, 41))).toEqual({
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
      confirming: false,
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
    expect(eventSheetReducer(closed, { type: "askDelete" }).confirming).toBe(true);
  });
});
