import {
  canSave,
  draftFromNote,
  initialNoteSheet,
  isDirty,
  isViewing,
  type NoteDraft,
  type NoteEditState,
  type NoteSheetAction,
  type NoteSheetState,
  newNoteBase,
  newNoteDraft,
  noteFromDraft,
  noteSheetReducer,
} from "./noteSheet";

const WIFI = { text: "Wi-Fi password is on the fridge!", author: "Dad" } as const;

function editing(state: NoteSheetState): NoteEditState {
  if (isViewing(state)) throw new Error("expected an edit step");

  return state;
}

function reduce(state: NoteSheetState, action: NoteSheetAction): NoteEditState {
  return editing(noteSheetReducer(state, action));
}

function opening(...args: Parameters<typeof initialNoteSheet>): NoteEditState {
  return editing(initialNoteSheet(...args));
}

describe("note sheet drafts", () => {
  it("NOTE-02 an existing note fills the message and name", () => {
    expect(draftFromNote(WIFI)).toEqual({ text: WIFI.text, author: "Dad" });
  });

  it("NOTE-02 a new note is blank before anyone posts from this screen", () => {
    expect(newNoteDraft()).toEqual({ text: "", author: "" });
  });

  it("NOTE-02 a new note prefills the last author posted from this screen", () => {
    expect(newNoteDraft({ author: "Mia" })).toEqual({ text: "", author: "Mia" });
  });

  it("tech§6 the sheet=newnote fixture fills the message", () => {
    expect(newNoteDraft({ text: "Has anyone seen my blue umbr" })).toEqual({
      text: "Has anyone seen my blue umbr",
      author: "",
    });
  });
});

describe("note sheet reducer", () => {
  const start = opening(draftFromNote(WIFI));

  it("NOTE-02 an existing note opens straight to editing", () => {
    expect(start.step).toBe("editing");
  });

  it("NOTE-02 message and name edits update the draft", () => {
    const text = reduce(start, { type: "text", value: "Back at 6" });
    const author = reduce(text, { type: "author", value: "Mom" });

    expect(author.draft).toEqual({ text: "Back at 6", author: "Mom" });
  });

  it("NOTE-10 Delete is not part of the edit", () => {
    expect(reduce(start, { type: "askDelete" })).toBe(start);
  });
});

describe("note sheet save", () => {
  const blank = opening(newNoteDraft());

  it("NOTE-03 Save with an empty message shows Write a message", () => {
    expect(reduce(blank, { type: "save" }).textError).toBe(true);
  });

  it("NOTE-03 a message of only spaces counts as empty", () => {
    expect(canSave({ text: "   ", author: "" })).toBe(false);
    expect(canSave({ text: "Back at 6", author: "" })).toBe(true);
  });

  it("NOTE-03 typing a message clears Write a message", () => {
    const failed = reduce(blank, { type: "save" });

    expect(reduce(failed, { type: "text", value: "B" }).textError).toBe(false);
  });

  it("NOTE-03 a sheet opens without the message error", () => {
    expect(blank.textError).toBe(false);
  });
});

describe("note from draft", () => {
  const base = {
    id: "0195f0a0-0000-7000-8000-000000000001",
    createdAt: new Date(2026, 9, 9, 8, 12).toISOString(),
    rotation: -2,
  };

  it("NOTE-03 a blank name posts unsigned", () => {
    expect(noteFromDraft({ text: "Back at 6", author: "  " }, base).author).toBe("");
  });

  it("NOTE-03 the message and name are trimmed", () => {
    expect(noteFromDraft({ text: " Back at 6 ", author: " Mom " }, base)).toEqual({
      ...base,
      text: "Back at 6",
      author: "Mom",
    });
  });

  it("NOTE-04 a new note is stamped now with a UUIDv7 id", () => {
    const now = new Date(2026, 9, 9, 10, 41);

    const fresh = newNoteBase(now, 0);

    expect(fresh.createdAt).toBe(now.toISOString());
    expect(fresh.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
  });

  it("NOTE-04 a new note's tilt cycles with the number of notes", () => {
    const now = new Date(2026, 9, 9, 10, 41);

    expect([0, 1, 2, 3, 4].map((count) => newNoteBase(now, count).rotation)).toEqual([
      -2, 1.5, -1, 2.5, -2,
    ]);
  });
});

describe("note sheet discard", () => {
  const draft = draftFromNote(WIFI);

  const start = opening(draft);

  const asking = reduce(reduce(start, { type: "text", value: "Back at 6" }), {
    type: "askDiscard",
  });

  it("§8.9 the opened note is not dirty", () => {
    expect(isDirty(start.draft, start.opened)).toBe(false);
  });

  it("§8.9 spaces around the message and name don't make the note dirty", () => {
    expect(isDirty({ ...draft, text: ` ${draft.text} `, author: "Dad " }, draft)).toBe(false);
  });

  it.each<[string, Partial<NoteDraft>]>([
    ["message", { text: "Back at 6" }],
    ["name", { author: "Mom" }],
  ])("§8.9 a changed %s makes the note dirty", (_, change) => {
    expect(isDirty({ ...draft, ...change }, draft)).toBe(true);
  });

  it("§8.9 a new note opened with text compares against a blank note", () => {
    const typed = opening(newNoteDraft({ text: "Has anyone seen" }), {
      opened: newNoteDraft(),
    });

    expect(isDirty(typed.draft, typed.opened)).toBe(true);
  });

  it("§8.9 a prefilled author alone doesn't make a new note dirty", () => {
    const prefilled = newNoteDraft({ author: "Mia" });

    expect(isDirty(opening(prefilled).draft, prefilled)).toBe(false);
  });

  it("§8.9 discard=1 opens on Discard changes?", () => {
    expect(opening(draft, { discard: true }).step).toBe("discarding");
  });

  it("§8.9 Keep editing brings the footer back with the draft kept", () => {
    expect(reduce(asking, { type: "keepEditing" })).toMatchObject({
      step: "editing",
      draft: { text: "Back at 6" },
    });
  });

  it.each<NoteSheetAction>([
    { type: "text", value: "Back at 7" },
    { type: "author", value: "Mom" },
  ])("§8.9 an edit ($type) brings the footer back", (action) => {
    expect(reduce(asking, action).step).toBe("editing");
  });
});

describe("note details", () => {
  const draft = draftFromNote(WIFI);

  const details = initialNoteSheet(draft, { details: true });

  const editingFromDetails = reduce(details, { type: "edit" });

  const changed = reduce(editingFromDetails, { type: "text", value: "Back at 6" });

  it("NOTE-01 a note opened straight to the form starts in Edit note", () => {
    expect(initialNoteSheet(draft)).toMatchObject({ step: "editing", fromDetails: false });
  });

  it("NOTE-10 details=1 opens Note details with the note as opened", () => {
    expect(details).toEqual({ step: "details", opened: draft });
  });

  it("NOTE-10 Delete in details asks for the inline confirm", () => {
    expect(noteSheetReducer(details, { type: "askDelete" })).toEqual({
      step: "deleting",
      opened: draft,
    });
  });

  it("NOTE-10 Edit from the delete confirm opens Edit note", () => {
    const deleting = noteSheetReducer(details, { type: "askDelete" });

    expect(reduce(deleting, { type: "edit" })).toMatchObject({ step: "editing", draft });
  });

  it("NOTE-10 details ignore every action but Delete and Edit", () => {
    expect(noteSheetReducer(details, { type: "text", value: "Back at 6" })).toBe(details);
  });

  it("NOTE-10 Edit swaps the sheet to Edit note", () => {
    expect(editingFromDetails).toMatchObject({ step: "editing", fromDetails: true, draft });
  });

  it("NOTE-10 going back to details drops the changes and the message error", () => {
    const failed = reduce(reduce(editingFromDetails, { type: "text", value: "" }), {
      type: "save",
    });

    const back = noteSheetReducer(failed, { type: "back" });

    expect(back).toEqual({ step: "details", opened: draft });
    expect(reduce(back, { type: "edit" }).textError).toBe(false);
  });

  it("NOTE-10 the close button asks to discard and remembers to return to details", () => {
    expect(reduce(changed, { type: "askDiscard", to: "details" })).toMatchObject({
      step: "discarding",
      discardTo: "details",
    });
  });

  it("NOTE-10 the scrim asks to discard and closes afterwards", () => {
    const asking = reduce(changed, { type: "askDiscard", to: "details" });

    const kept = reduce(asking, { type: "keepEditing" });

    expect(reduce(kept, { type: "askDiscard" })).toMatchObject({ discardTo: null });
  });

  it("NOTE-10 Discard from the close button returns to details", () => {
    const asking = reduce(changed, { type: "askDiscard", to: "details" });

    expect(noteSheetReducer(asking, { type: "back" })).toEqual({ step: "details", opened: draft });
  });

  it("NOTE-10 Save from details returns to details with the new text", () => {
    const saved = noteSheetReducer(changed, { type: "saved" });

    expect(saved).toEqual({ step: "details", opened: { ...draft, text: "Back at 6" } });
  });

  it("NOTE-10 discard=1 with details=1 opens the edit with the prompt that returns to details", () => {
    expect(initialNoteSheet(draft, { details: true, discard: true })).toMatchObject({
      step: "discarding",
      fromDetails: true,
      discardTo: "details",
    });
  });
});
