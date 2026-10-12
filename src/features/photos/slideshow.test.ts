import type { Photo } from "@/domain/schemas";
import {
  newestFirst,
  photoMeta,
  slideIndex,
  slideshow,
  startSlideshow,
  wrapIndex,
} from "./slideshow";

const photo = (title: string, createdAt: string, place?: string): Photo => ({
  id: title,
  title,
  takenOn: "2026-09-27",
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
  expect(photoMeta(photo("Apple picking", "2026-10-05T19:00:00.000Z", "Sauvie Island"))).toBe(
    "Sep 27 · Sauvie Island",
  );
});

test("PHOTO-03 a photo with no place shows the date alone", () => {
  expect(photoMeta(photo("IMG_2041", "2026-10-05T19:00:00.000Z"))).toBe("Sep 27");
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
  const paused = slideshow(startSlideshow(AT), { type: "toggle", at: later(9_000) });

  expect(paused).toEqual({ kind: "paused", index: 1 });
  expect(slideIndex(paused, later(60_000))).toBe(1);
});

test("PHOTO-02 playing again waits a full 8 s before the next photo", () => {
  const paused = slideshow(startSlideshow(AT), { type: "toggle", at: later(9_000) });

  const playing = slideshow(paused, { type: "toggle", at: later(20_000) });

  expect(slideIndex(playing, later(27_999))).toBe(1);
  expect(slideIndex(playing, later(28_000))).toBe(2);
});

test("PHOTO-02 a thumb features that photo, keeps playing and restarts the 8 s wait", () => {
  const show = slideshow(startSlideshow(AT), { type: "select", index: 4, at: later(7_000) });

  expect(slideIndex(show, later(14_999))).toBe(4);
  expect(slideIndex(show, later(15_000))).toBe(5);
});

test("PHOTO-02 a chevron steps from the photo shown now and keeps playing", () => {
  const show = slideshow(startSlideshow(AT), { type: "step", delta: -1, at: later(8_500) });

  expect(slideIndex(show, later(8_500))).toBe(0);
  expect(slideIndex(show, later(16_500))).toBe(1);
});

test("PHOTO-01 thumbs and chevrons while paused stay paused", () => {
  const paused = slideshow(startSlideshow(AT), { type: "toggle", at: AT });

  const stepped = slideshow(paused, { type: "step", delta: 1, at: later(1_000) });

  expect(stepped).toEqual({ kind: "paused", index: 1 });
  expect(slideshow(stepped, { type: "select", index: 3, at: later(2_000) })).toEqual({
    kind: "paused",
    index: 3,
  });
});
