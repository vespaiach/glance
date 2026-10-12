import type { Photo } from "@/domain/schemas";
import { newestFirst, photoMeta, wrapIndex } from "./slideshow";

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
