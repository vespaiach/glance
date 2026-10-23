import type { Photo } from "@/domain/schemas";
import {
  newestFirst,
  openSlideshow,
  photoHint,
  photoMeta,
  settleSlideshow,
  slideIndex,
  slideshow,
  startSlideshow,
  wrapIndex,
} from "./slideshow";

const photo = (title: string, createdAt: string, place?: string): Photo => ({
  id: title,
  title,
  takenOn: "2026-09-27",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  createdAt,
  ...(place && { place }),
});

test("PHOTO-03 new photos go first", () => {
  const older = photo("Forest Park trail", "2026-10-05T19:00:00.000Z");
  const newer = photo("Cannon Beach", "2026-10-05T19:05:00.000Z");

  expect(newestFirst([older, newer]).map((row) => row.title)).toEqual([
    "Cannon Beach",
    "Forest Park trail",
  ]);
});

test("PHOTO-01 stepping past either end wraps around", () => {
  expect(wrapIndex(6, 6)).toBe(0);
  expect(wrapIndex(-1, 6)).toBe(5);
  expect(wrapIndex(2, 6)).toBe(2);
});

test("PHOTO-01 an index stays in range when the list shrinks", () => {
  expect(wrapIndex(7, 3)).toBe(1);
});

test("spec§8.6 the featured eyebrow reads date · place", () => {
  expect(photoMeta(photo("Apple picking", "2026-10-05T19:00:00.000Z", "Sauvie Island"), 2026)).toBe(
    "Sep 27 · Sauvie Island",
  );
});

test("PHOTO-03 a photo with no place shows the date alone", () => {
  expect(photoMeta(photo("IMG_2041", "2026-10-05T19:00:00.000Z"), 2026)).toBe("Sep 27");
});

test("PHOTO-11 a photo from another year shows its year", () => {
  const halloween = {
    ...photo("Halloween costumes", "2026-10-09T17:31:00.000Z"),
    takenOn: "2025-10-31",
  };

  expect(photoMeta(halloween, 2026)).toBe("Oct 31, 2025");
});

test("PHOTO-11 a photo with no date reads No date", () => {
  const { takenOn: _takenOn, ...undated } = photo(
    "Beach",
    "2026-10-09T17:31:00.000Z",
    "Seaside, OR",
  );

  expect(photoMeta(undated, 2026)).toBe("No date · Seaside, OR");
});

const guessed = (sources: Photo["sources"], checked = false): Photo => ({
  ...photo("Guess", "2026-10-09T17:31:00.000Z"),
  sources,
  checked,
});

test.each([
  [
    { title: "file-name", takenOn: "file-name", place: "none" },
    "Name and date guessed from the file name. No place found.",
  ],
  [
    { title: "photo", takenOn: "file-date", place: "photo-location" },
    "Date guessed from the file date.",
  ],
  [
    { title: "place", takenOn: "photo", place: "photo-location" },
    "Name guessed from where it was taken.",
  ],
  [
    { title: "file", takenOn: "file-date", place: "none" },
    "Name guessed from the file name. Date guessed from the file date. No place found.",
  ],
] as const)("PHOTO-10 a photo not checked yet gets the guessed hint %o", (sources, hint) => {
  expect(photoHint(guessed(sources))).toBe(hint);
});

test("PHOTO-10 a photo whose details were all read from it has no hint", () => {
  expect(
    photoHint(guessed({ title: "photo", takenOn: "photo", place: "photo-location" })),
  ).toBeUndefined();
});

test("PHOTO-12 the hint goes once the details are saved", () => {
  expect(
    photoHint(guessed({ title: "file-name", takenOn: "file-name", place: "none" }, true)),
  ).toBeUndefined();
});

const AT = new Date(2026, 9, 9, 10, 41);

const later = (ms: number) => new Date(AT.getTime() + ms);

test("PHOTO-02 a playing slideshow advances one photo every 8 s", () => {
  const show = startSlideshow(AT);

  expect(slideIndex(show, later(7_999))).toBe(0);
  expect(slideIndex(show, later(8_000))).toBe(1);
  expect(slideIndex(show, later(24_000))).toBe(3);
});

test("PHOTO-02 pausing keeps the photo shown at that moment", () => {
  const paused = slideshow(startSlideshow(AT), { type: "toggle", at: later(9_000), ids: [] });

  expect(paused).toEqual({ kind: "paused", index: 1 });
  expect(slideIndex(paused, later(60_000))).toBe(1);
});

test("PHOTO-02 playing again waits a full 8 s before the next photo", () => {
  const paused = slideshow(startSlideshow(AT), { type: "toggle", at: later(9_000), ids: [] });

  const playing = slideshow(paused, { type: "toggle", at: later(20_000), ids: [] });

  expect(slideIndex(playing, later(27_999))).toBe(1);
  expect(slideIndex(playing, later(28_000))).toBe(2);
});

test("PHOTO-02 a thumb features that photo, keeps playing and restarts the 8 s wait", () => {
  const show = slideshow(startSlideshow(AT), {
    type: "select",
    index: 4,
    at: later(7_000),
    ids: [],
  });

  expect(slideIndex(show, later(14_999))).toBe(4);
  expect(slideIndex(show, later(15_000))).toBe(5);
});

test("PHOTO-02 a chevron steps from the photo shown now and keeps playing", () => {
  const show = slideshow(startSlideshow(AT), {
    type: "step",
    delta: -1,
    at: later(8_500),
    ids: [],
  });

  expect(slideIndex(show, later(8_500))).toBe(0);
  expect(slideIndex(show, later(16_500))).toBe(1);
});

test("PHOTO-01 thumbs and chevrons while paused stay paused", () => {
  const paused = slideshow(startSlideshow(AT), { type: "toggle", at: AT, ids: [] });

  const stepped = slideshow(paused, { type: "step", delta: 1, at: later(1_000), ids: [] });

  expect(stepped).toEqual({ kind: "paused", index: 1 });
  expect(slideshow(stepped, { type: "select", index: 3, at: later(2_000), ids: [] })).toEqual({
    kind: "paused",
    index: 3,
  });
});

test("PHOTO-11 opening Photo details pauses on the photo shown", () => {
  const paused = slideshow(startSlideshow(AT), { type: "pause", at: later(9_000), ids: [] });

  expect(paused).toEqual({ kind: "paused", index: 1 });
  expect(slideshow(paused, { type: "pause", at: later(20_000), ids: [] })).toEqual(paused);
});

const IDS = ["coast", "apples", "trail"];

test("PHOTO-01 opened on a known photo, the slideshow features it paused", () => {
  const show = settleSlideshow(openSlideshow(AT, "apples"), IDS);

  expect(show).toEqual({ kind: "paused", index: 1 });
  expect(slideIndex(show, later(60_000))).toBe(1);
});

test("PHOTO-01 opened on an unknown photo, the slideshow plays from the first photo as usual", () => {
  const show = settleSlideshow(openSlideshow(AT, "gone"), IDS);

  expect(show).toEqual(startSlideshow(AT));
});

test("PHOTO-01 opened with no photo, the slideshow plays as usual", () => {
  expect(openSlideshow(AT, null)).toEqual(startSlideshow(AT));
});

test("PHOTO-01 play=0 opens the slideshow paused on the first photo", () => {
  expect(openSlideshow(AT, null, false)).toEqual({ kind: "paused", index: 0 });
});

test("PHOTO-01 a photo id opens pinned on it whether or not the slideshow plays", () => {
  expect(openSlideshow(AT, "apples", false)).toEqual(openSlideshow(AT, "apples"));
});

test("PHOTO-01 the pinned photo is found once the photos load", () => {
  const show = openSlideshow(AT, "apples");

  expect(settleSlideshow(show, [])).toEqual(startSlideshow(AT));
  expect(settleSlideshow(show, IDS)).toEqual({ kind: "paused", index: 1 });
});

test("PHOTO-01 play on the pinned photo plays on from it", () => {
  const playing = slideshow(openSlideshow(AT, "trail"), {
    type: "toggle",
    at: later(5_000),
    ids: IDS,
  });

  expect(playing).toEqual(startSlideshow(later(5_000), 2));
});

test("PHOTO-01 a chevron on the pinned photo steps from it and stays paused", () => {
  const stepped = slideshow(openSlideshow(AT, "apples"), {
    type: "step",
    delta: 1,
    at: later(5_000),
    ids: IDS,
  });

  expect(stepped).toEqual({ kind: "paused", index: 2 });
});

test("PHOTO-15 pinning pauses the slideshow on that photo", () => {
  const at = new Date(2026, 9, 9, 10, 41);

  const show = slideshow(startSlideshow(at), {
    type: "pin",
    photoId: "Cannon Beach",
    at,
    ids: ["Forest Park trail", "Apple picking", "Cannon Beach"],
  });

  expect(show).toEqual({ kind: "paused", index: 2 });
});
