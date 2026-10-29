import { newEventDraft } from "./eventDraft";
import {
  canSave,
  type EventPageAction,
  type EventPageState,
  eventPageReducer,
  initialEventPage,
  type PageDraft,
} from "./eventPage";

const tz = "UTC";

const NOW = new Date("2026-10-09T10:41:00Z");

const DAY = "2026-10-09";

const at = (h: number, m = 0) => h * 60 + m;

const BLANK: PageDraft = { ...newEventDraft(NOW, tz, ["mom"]), day: DAY };

const LUNCH: PageDraft = {
  ...BLANK,
  title: "Lunch",
  start: at(12),
  end: at(13),
  location: "Café",
};

const run = (state: EventPageState, ...actions: EventPageAction[]) =>
  actions.reduce(eventPageReducer, state);

const editing = (state: EventPageState) => {
  if (state.mode !== "new" && state.mode !== "edit") throw new Error(`mode ${state.mode}`);

  return state;
};

describe("eventPage", () => {
  it("TPK-05 EVT-03 a new event starts on the title with the next whole hour and nothing touched", () => {
    const state = editing(initialEventPage("new", BLANK));

    expect(state.word).toBe("title");
    expect(state.touched).toEqual([]);
    expect(state.draft).toMatchObject({ start: at(11), end: at(12), notify: true });
  });

  it("EVT-03 edit event starts with every word set", () => {
    expect(editing(initialEventPage("edit", LUNCH, "where")).touched).toEqual([
      "day",
      "start",
      "end",
      "who",
    ]);
  });

  it("EVT-03 tapping a default word sets it", () => {
    const state = editing(run(initialEventPage("new", BLANK), { type: "select", word: "who" }));

    expect(state.word).toBe("who");
    expect(state.touched).toEqual(["who"]);
  });

  it("EVT-03 EVT-12 Next moves through the words and sets each default it reaches", () => {
    const state = editing(run(initialEventPage("new", BLANK), { type: "next" }, { type: "next" }));

    expect(state.word).toBe("start");
    expect(state.touched).toEqual(["day", "start"]);
  });

  it("EVT-12 Next skips Ends on an all-day draft", () => {
    const state = run(
      initialEventPage("new", BLANK, "start"),
      { type: "allDay", value: true },
      { type: "next" },
    );

    expect(editing(state).word).toBe("who");
  });

  it("EVT-12 Next stays on Notes, the last word", () => {
    expect(editing(run(initialEventPage("new", BLANK, "notes"), { type: "next" })).word).toBe(
      "notes",
    );
  });

  it("EVT-03 changing the day sets it", () => {
    const state = editing(
      run(initialEventPage("new", BLANK), { type: "day", value: "2026-10-10" }),
    );

    expect(state.draft.day).toBe("2026-10-10");
    expect(state.touched).toEqual(["day"]);
  });

  it("TPK-06 changing the start keeps the length and sets the start", () => {
    const state = editing(run(initialEventPage("new", LUNCH), { type: "start", value: at(15) }));

    expect(state.draft).toMatchObject({ start: at(15), end: at(16) });
    expect(state.touched).toEqual(["start"]);
  });

  it("TPK-06 a late start caps the end at 11:55 PM", () => {
    const state = editing(
      run(initialEventPage("new", LUNCH), { type: "start", value: at(23, 30) }),
    );

    expect(state.draft).toMatchObject({ start: at(23, 30), end: at(23, 55) });
  });

  it("TPK-07 an end pick earlier than start + 5 min moves to start + 5 min", () => {
    const state = editing(run(initialEventPage("new", LUNCH), { type: "end", value: at(11) }));

    expect(state.draft.end).toBe(at(12, 5));
    expect(state.touched).toEqual(["end"]);
  });

  it("TPK-04 EVT-03 picking a length sets the end", () => {
    const state = editing(run(initialEventPage("new", LUNCH), { type: "length", minutes: 90 }));

    expect(state.draft.end).toBe(at(13, 30));
    expect(state.touched).toEqual(["end"]);
  });

  it("TPK-08 No end time clears the end and moves to Who", () => {
    const state = editing(run(initialEventPage("new", LUNCH, "end"), { type: "noEnd" }));

    expect(state.draft.end).toBeUndefined();
    expect(state.word).toBe("who");
  });

  it("TPK-08 Add end time sets start + 1 h and opens Ends", () => {
    const state = editing(
      run(initialEventPage("new", LUNCH), { type: "noEnd" }, { type: "addEnd" }),
    );

    expect(state.draft.end).toBe(at(13));
    expect(state.word).toBe("end");
    expect(state.touched).toContain("end");
  });

  it("EVT-08 all day off brings back the draft's times", () => {
    const state = editing(
      run(
        initialEventPage("new", LUNCH, "start"),
        { type: "allDay", value: true },
        { type: "allDay", value: false },
      ),
    );

    expect(state.draft).toMatchObject({ start: at(12), end: at(13) });
    expect(state.draft.allDay).toBeUndefined();
  });

  it("EVT-03 Save is disabled until the title has text", () => {
    expect(canSave(BLANK)).toBe(false);
    expect(canSave({ ...BLANK, title: "   " })).toBe(false);
    expect(canSave({ ...BLANK, title: "Swim" })).toBe(true);
  });

  it("EVT-05 × with no changes closes at once", () => {
    expect(run(initialEventPage("new", BLANK), { type: "close" })).toEqual({ mode: "closed" });
  });

  it("EVT-05 × after a change and back again closes at once", () => {
    const state = run(
      initialEventPage("new", BLANK),
      { type: "title", value: "Swim" },
      { type: "title", value: "" },
      { type: "close" },
    );

    expect(state).toEqual({ mode: "closed" });
  });

  it("EVT-05 × with changes asks Discard changes?", () => {
    const state = run(
      initialEventPage("new", BLANK),
      { type: "title", value: "Swim" },
      {
        type: "close",
      },
    );

    expect(editing(state).asking).toBe("discard");
  });

  it("NOTIF-09 changing the Notification counts as a change", () => {
    const state = run(
      initialEventPage("new", BLANK),
      { type: "notify", value: false },
      {
        type: "close",
      },
    );

    expect(editing(state).asking).toBe("discard");
  });

  it("EVT-12 Every week sets repeat, marks the day as set and counts as a change", () => {
    const state = editing(
      run(initialEventPage("new", BLANK, "day"), { type: "repeat", value: true }),
    );

    expect(state.draft.repeat).toBe("weekly");
    expect(state.touched).toContain("day");
    expect(editing(run(state, { type: "close" })).asking).toBe("discard");
  });

  it("EVT-12 One day leaves repeat out of the draft", () => {
    const state = editing(
      run(
        initialEventPage("new", BLANK, "day"),
        { type: "repeat", value: true },
        { type: "repeat", value: false },
      ),
    );

    expect(state.draft).not.toHaveProperty("repeat");
  });

  it("EVT-05 Keep editing brings the actions back with the draft kept", () => {
    const state = editing(
      run(
        initialEventPage("new", BLANK),
        { type: "title", value: "Swim" },
        { type: "close" },
        { type: "keepEditing" },
      ),
    );

    expect(state.asking).toBe("none");
    expect(state.draft.title).toBe("Swim");
  });

  it("EVT-05 an edit while asking brings the actions back", () => {
    const state = run(
      initialEventPage("new", BLANK),
      { type: "title", value: "Swim" },
      { type: "close" },
      { type: "title", value: "Swims" },
    );

    expect(editing(state).asking).toBe("none");
  });

  it("EVT-05 Discard drops the changes and closes", () => {
    const state = run(
      initialEventPage("new", BLANK),
      { type: "title", value: "Swim" },
      { type: "close" },
      { type: "discard" },
    );

    expect(state).toEqual({ mode: "closed" });
  });

  it("EVT-05 EVT-10 from Event details, × with no changes returns to details", () => {
    const state = run(
      initialEventPage("view", LUNCH),
      { type: "edit", word: "title", ended: false },
      { type: "close" },
    );

    expect(state).toEqual({ mode: "view", opened: LUNCH });
  });

  it("EVT-05 EVT-10 from Event details, Discard returns to details with the old values", () => {
    const state = run(
      initialEventPage("view", LUNCH),
      { type: "edit", word: "title", ended: false },
      { type: "title", value: "Brunch" },
      { type: "close" },
      { type: "discard" },
    );

    expect(state).toEqual({ mode: "view", opened: LUNCH });
  });

  it("EVT-07 EVT-10 Save from Event details returns to details with the new values", () => {
    const state = run(
      initialEventPage("view", LUNCH),
      { type: "edit", word: "title", ended: false },
      { type: "title", value: "Brunch" },
      { type: "saved" },
    );

    expect(state).toEqual({ mode: "view", opened: { ...LUNCH, title: "Brunch" } });
  });

  it("EVT-07 Save on a new event closes the page", () => {
    const state = run(
      initialEventPage("new", BLANK),
      { type: "title", value: "Swim" },
      {
        type: "saved",
      },
    );

    expect(state).toEqual({ mode: "closed" });
  });

  it("EVT-10 a tapped value opens Edit event on that word with every word set", () => {
    const state = editing(
      run(initialEventPage("view", LUNCH), { type: "edit", word: "where", ended: false }),
    );

    expect(state).toMatchObject({ mode: "edit", word: "where", fromDetails: true, asking: "none" });
    expect(state.touched).toEqual(["day", "start", "end", "who"]);
  });

  it("EVT-09 an ended event never leaves Event details", () => {
    const view = initialEventPage("view", LUNCH);

    expect(run(view, { type: "edit", word: "title", ended: true })).toBe(view);
  });

  it("EVT-09 × on Event details closes the page", () => {
    expect(run(initialEventPage("view", LUNCH), { type: "close" })).toEqual({ mode: "closed" });
  });

  it("EVT-06 Delete asks first, Keep backs out and Delete event closes the page", () => {
    const asking = run(initialEventPage("edit", LUNCH), { type: "askDelete" });

    expect(editing(asking).asking).toBe("delete");
    expect(editing(run(asking, { type: "keep" })).asking).toBe("none");
    expect(run(asking, { type: "deleted" })).toEqual({ mode: "closed" });
  });

  it("EVT-06 EVT-10 Delete from an edit opened from details closes the page", () => {
    const state = run(
      initialEventPage("view", LUNCH),
      { type: "edit", word: "title", ended: false },
      { type: "askDelete" },
      { type: "deleted" },
    );

    expect(state).toEqual({ mode: "closed" });
  });

  it("EVT-06 a new event has no Delete", () => {
    expect(editing(run(initialEventPage("new", BLANK), { type: "askDelete" })).asking).toBe("none");
  });
});
