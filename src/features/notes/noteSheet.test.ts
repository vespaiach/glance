import {
  draftFromNote,
  initialNoteSheet,
  newNoteDraft,
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
