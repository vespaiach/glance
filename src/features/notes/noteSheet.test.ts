import {
  canSave,
  draftFromNote,
  initialNoteSheet,
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
    expect(start.confirming).toBe(false);
  });

  it("NOTE-02 message, name and color edits update the draft", () => {
    const text = noteSheetReducer(start, { type: "text", value: "Back at 6" });
    const author = noteSheetReducer(text, { type: "author", value: "Mom" });
    const tone = noteSheetReducer(author, { type: "tone", value: "soft" });

    expect(tone.draft).toEqual({ text: "Back at 6", author: "Mom", tone: "soft" });
  });

  it("NOTE-05 Delete asks for the inline confirm", () => {
    expect(noteSheetReducer(start, { type: "askDelete" }).confirming).toBe(true);
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
