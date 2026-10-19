import {
  canSave,
  draftFromNote,
  initialNoteSheet,
  isDirty,
  type NoteDraft,
  type NoteSheetAction,
  newNoteBase,
  newNoteDraft,
  noteFromDraft,
  noteSheetReducer,
  noteSwatches,
} from "./noteSheet";

const WIFI = { text: "Wi-Fi password is on the fridge!", author: "Dad", tone: 1 } as const;

describe("note sheet drafts", () => {
  it("NOTE-02 an existing note fills the message, name and color", () => {
    expect(draftFromNote(WIFI)).toEqual({ text: WIFI.text, author: "Dad", tone: 1 });
  });

  it("NOTE-02 a new note is blank with color 1", () => {
    expect(newNoteDraft()).toEqual({ text: "", author: "", tone: 1 });
  });

  it("tech§6 the sheet=newnote fixture fills the message and color", () => {
    expect(newNoteDraft({ text: "Has anyone seen my blue umbr", tone: 2 })).toEqual({
      text: "Has anyone seen my blue umbr",
      author: "",
      tone: 2,
    });
  });

  it("NOTE-02 the swatches are the five season colors with no Alert", () => {
    expect(noteSwatches("fall")).toEqual([
      { value: 1, label: "Amber" },
      { value: 2, label: "Rust" },
      { value: 3, label: "Sage" },
      { value: 4, label: "Coral" },
      { value: "soft", label: "Cream" },
    ]);
  });
});

describe("note sheet reducer", () => {
  const start = initialNoteSheet(draftFromNote(WIFI));

  it("NOTE-05 opens without the delete confirm", () => {
    expect(start.confirm).toBeNull();
  });

  it("NOTE-02 message, name and color edits update the draft", () => {
    const text = noteSheetReducer(start, { type: "text", value: "Back at 6" });
    const author = noteSheetReducer(text, { type: "author", value: "Mom" });
    const tone = noteSheetReducer(author, { type: "tone", value: "soft" });

    expect(tone.draft).toEqual({ text: "Back at 6", author: "Mom", tone: "soft" });
  });

  it("NOTE-05 Delete asks for the inline confirm", () => {
    expect(noteSheetReducer(start, { type: "askDelete" }).confirm).toBe("delete");
  });
});

describe("note sheet save", () => {
  const blank = initialNoteSheet(newNoteDraft());

  it("NOTE-03 Save with an empty message shows Write a message", () => {
    expect(noteSheetReducer(blank, { type: "save" }).textError).toBe(true);
  });

  it("NOTE-03 a message of only spaces counts as empty", () => {
    expect(canSave({ text: "   ", author: "", tone: 1 })).toBe(false);
    expect(canSave({ text: "Back at 6", author: "", tone: 1 })).toBe(true);
  });

  it("NOTE-03 typing a message clears Write a message", () => {
    const failed = noteSheetReducer(blank, { type: "save" });

    expect(noteSheetReducer(failed, { type: "text", value: "B" }).textError).toBe(false);
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

  it("NOTE-03 a blank name posts as Guest", () => {
    expect(noteFromDraft({ text: "Back at 6", author: "  ", tone: 2 }, base).author).toBe("Guest");
  });

  it("NOTE-03 the message and name are trimmed", () => {
    expect(noteFromDraft({ text: " Back at 6 ", author: " Mom ", tone: 2 }, base)).toEqual({
      ...base,
      text: "Back at 6",
      author: "Mom",
      tone: 2,
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

  const start = initialNoteSheet(draft);

  const asking = noteSheetReducer(noteSheetReducer(start, { type: "text", value: "Back at 6" }), {
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
    ["color", { tone: "soft" }],
  ])("§8.9 a changed %s makes the note dirty", (_, change) => {
    expect(isDirty({ ...draft, ...change }, draft)).toBe(true);
  });

  it("§8.9 a new note opened with text compares against a blank note", () => {
    const typed = initialNoteSheet(newNoteDraft({ text: "Has anyone seen", tone: 2 }), {
      opened: newNoteDraft(),
    });

    expect(isDirty(typed.draft, typed.opened)).toBe(true);
  });

  it("§8.9 discard=1 opens on Discard changes?", () => {
    expect(initialNoteSheet(draft, { discard: true }).confirm).toBe("discard");
  });

  it("§8.9 asking to discard replaces a waiting delete confirm", () => {
    const deleting = noteSheetReducer(start, { type: "askDelete" });

    expect(noteSheetReducer(deleting, { type: "askDiscard" }).confirm).toBe("discard");
  });

  it("§8.9 Keep editing brings the footer back with the draft kept", () => {
    expect(noteSheetReducer(asking, { type: "keepEditing" })).toMatchObject({
      confirm: null,
      draft: { text: "Back at 6" },
    });
  });

  it.each<NoteSheetAction>([
    { type: "text", value: "Back at 7" },
    { type: "author", value: "Mom" },
    { type: "tone", value: 3 },
  ])("§8.9 an edit ($type) brings the footer back", (action) => {
    expect(noteSheetReducer(asking, action).confirm).toBeNull();
  });
});

describe("note details", () => {
  const draft = draftFromNote(WIFI);

  const details = initialNoteSheet(draft, { details: true });

  const editing = noteSheetReducer(details, { type: "edit" });

  const changed = noteSheetReducer(editing, { type: "text", value: "Back at 6" });

  it("NOTE-01 a note opened straight to the form starts in Edit note", () => {
    expect(initialNoteSheet(draft)).toMatchObject({ view: "edit", fromDetails: false });
  });

  it("NOTE-10 details=1 opens Note details with the note as opened", () => {
    expect(details).toMatchObject({ view: "details", fromDetails: true, opened: draft });
  });

  it("NOTE-10 Edit swaps the sheet to Edit note", () => {
    expect(editing).toMatchObject({ view: "edit", fromDetails: true, draft });
  });

  it("NOTE-10 going back to details drops the changes and the message error", () => {
    const failed = noteSheetReducer(noteSheetReducer(editing, { type: "text", value: "" }), {
      type: "save",
    });

    expect(noteSheetReducer(failed, { type: "back" })).toMatchObject({
      view: "details",
      draft,
      textError: false,
      confirm: null,
    });
  });

  it("NOTE-10 Cancel asks to discard and remembers to return to details", () => {
    expect(noteSheetReducer(changed, { type: "askDiscard", to: "details" })).toMatchObject({
      confirm: "discard",
      discardTo: "details",
    });
  });

  it("NOTE-10 the close button asks to discard and closes afterwards", () => {
    const asking = noteSheetReducer(changed, { type: "askDiscard", to: "details" });

    const kept = noteSheetReducer(asking, { type: "keepEditing" });

    expect(noteSheetReducer(kept, { type: "askDiscard" }).discardTo).toBeNull();
  });

  it("NOTE-10 Discard from Cancel returns to details", () => {
    const asking = noteSheetReducer(changed, { type: "askDiscard", to: "details" });

    expect(noteSheetReducer(asking, { type: "back" })).toMatchObject({
      view: "details",
      draft,
      confirm: null,
      discardTo: null,
    });
  });

  it("NOTE-10 Save from details returns to details with the new text", () => {
    const saved = noteSheetReducer(changed, { type: "saved" });

    expect(saved).toMatchObject({ view: "details", opened: { text: "Back at 6" } });
    expect(isDirty(saved.draft, saved.opened)).toBe(false);
  });

  it("NOTE-10 discard=1 with details=1 opens the edit with the prompt that returns to details", () => {
    expect(initialNoteSheet(draft, { details: true, discard: true })).toMatchObject({
      view: "edit",
      fromDetails: true,
      confirm: "discard",
      discardTo: "details",
    });
  });
});
