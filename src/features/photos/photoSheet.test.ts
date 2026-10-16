import type { Photo } from "@/domain/schemas";
import {
  draftFromPhoto,
  fieldSource,
  initialPhotoSheet,
  isDirty,
  type PhotoSheetAction,
  photoFromDraft,
  photoSheetReducer,
} from "./photoSheet";

const TODAY = "2026-10-09";

const BEACH: Photo = {
  id: "0192f3a0-1111-7000-8000-000000000007",
  title: "Cannon Beach",
  takenOn: "2026-08-16",
  place: "Cannon Beach, OR",
  createdAt: "2026-10-09T17:30:00.000Z",
  sources: { title: "place", takenOn: "photo", place: "photo-location" },
  checked: false,
  fileName: "IMG_4410.JPG",
};

const opened = initialPhotoSheet(draftFromPhoto(BEACH));

function stateAfter(...actions: PhotoSheetAction[]) {
  return actions.reduce(photoSheetReducer, opened);
}

describe("photo sheet drafts", () => {
  it("PHOTO-12 opens with the photo's name, date and place", () => {
    expect(draftFromPhoto(BEACH)).toEqual({
      title: "Cannon Beach",
      takenOn: "2026-08-16",
      place: "Cannon Beach, OR",
    });
  });

  it("PHOTO-11 a photo with no date or place opens with them empty", () => {
    const { takenOn: _takenOn, place: _place, ...bare } = BEACH;

    expect(draftFromPhoto(bare)).toEqual({ title: "Cannon Beach", takenOn: "", place: "" });
  });

  it("D22 the sheet=photo fixture can open asking to discard", () => {
    expect(initialPhotoSheet(draftFromPhoto(BEACH), { discard: true }).confirm).toBe("discard");
  });
});

describe("photo sheet source captions", () => {
  it("PHOTO-12 each field shows where its value came from", () => {
    expect(
      ["title", "takenOn", "place"].map((field) =>
        fieldSource(opened, BEACH.sources, field as "title"),
      ),
    ).toEqual(["place", "photo", "photo-location"]);
  });

  it("PHOTO-12 a changed field reads Edited", () => {
    const state = stateAfter({ type: "edit", field: "place", value: "Seaside, OR" });

    expect(fieldSource(state, BEACH.sources, "place")).toBe("edited");
    expect(fieldSource(state, BEACH.sources, "title")).toBe("place");
  });

  it("PHOTO-12 a field changed back to how it opened shows its source again", () => {
    const state = stateAfter(
      { type: "edit", field: "title", value: "Beach" },
      { type: "edit", field: "title", value: "Cannon Beach " },
    );

    expect(fieldSource(state, BEACH.sources, "title")).toBe("place");
  });
});

describe("photoSheetReducer", () => {
  it("PHOTO-12 Save with an empty name asks for a name", () => {
    expect(
      stateAfter({ type: "edit", field: "title", value: "  " }, { type: "save", today: TODAY })
        .error,
    ).toBe("name");
  });

  it("PHOTO-12 typing a name clears the error", () => {
    const state = stateAfter(
      { type: "edit", field: "title", value: "" },
      { type: "save", today: TODAY },
      { type: "edit", field: "title", value: "B" },
    );

    expect(state.error).toBeNull();
  });

  it("PHOTO-12 Save refuses a date after today", () => {
    const state = stateAfter(
      { type: "edit", field: "takenOn", value: "2026-10-10" },
      { type: "save", today: TODAY },
    );

    expect(state.error).toBe("future");
  });

  it("PHOTO-12 today and no date are fine", () => {
    expect(
      stateAfter({ type: "edit", field: "takenOn", value: TODAY }, { type: "save", today: TODAY })
        .error,
    ).toBeNull();
    expect(
      stateAfter({ type: "edit", field: "takenOn", value: "" }, { type: "save", today: TODAY })
        .error,
    ).toBeNull();
  });

  it("PHOTO-13 Delete asks before it deletes", () => {
    expect(stateAfter({ type: "askDelete" }).confirm).toBe("delete");
  });

  it("spec§8.9 an edit while asking to discard goes back to the sheet", () => {
    const state = stateAfter({ type: "askDiscard" }, { type: "edit", field: "place", value: "X" });

    expect(state.confirm).toBeNull();
  });

  it("spec§8.9 Keep editing goes back to the sheet", () => {
    expect(stateAfter({ type: "askDiscard" }, { type: "keepEditing" }).confirm).toBeNull();
  });

  it("spec§8.9 only a real change makes the sheet dirty", () => {
    const draft = draftFromPhoto(BEACH);

    expect(isDirty({ ...draft, title: " Cannon Beach " }, draft)).toBe(false);
    expect(isDirty({ ...draft, takenOn: "" }, draft)).toBe(true);
  });
});

describe("photoFromDraft", () => {
  it("PHOTO-12 saves the trimmed values, marks only the changed fields Edited and the photo checked", () => {
    const draft = {
      title: " Mia at the beach ",
      takenOn: "2026-08-16",
      place: " Cannon Beach, OR ",
    };

    expect(photoFromDraft(BEACH, draft, draftFromPhoto(BEACH))).toEqual({
      ...BEACH,
      title: "Mia at the beach",
      sources: { title: "edited", takenOn: "photo", place: "photo-location" },
      checked: true,
    });
  });

  it("PHOTO-11 clearing the date and the place saves the photo with neither", () => {
    const saved = photoFromDraft(
      BEACH,
      { title: "Cannon Beach", takenOn: "", place: "" },
      draftFromPhoto(BEACH),
    );

    expect(saved).not.toHaveProperty("takenOn");
    expect(saved).not.toHaveProperty("place");
    expect(saved.sources).toEqual({ title: "place", takenOn: "edited", place: "edited" });
  });

  it("PHOTO-12 leaves the server's copy of the row behind", () => {
    const stored = { ...BEACH, updatedAt: "2026-10-09T17:30:00.000Z", version: 4 };

    expect(photoFromDraft(stored, draftFromPhoto(BEACH), draftFromPhoto(BEACH))).toEqual({
      ...BEACH,
      checked: true,
    });
  });
});
