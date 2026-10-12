import { pictureOfDay } from "./pictureOfDay";
import type { Photo } from "./schemas";

const photo = (id: string, createdAt: string): Photo => ({
  id,
  title: id,
  takenOn: "2026-09-01",
  createdAt,
});

const photos = [
  photo("c", "2026-09-03T00:00:00.000Z"),
  photo("a", "2026-09-01T00:00:00.000Z"),
  photo("b", "2026-09-02T00:00:00.000Z"),
];

describe("pictureOfDay", () => {
  it("TODAY-07 no photos means no picture", () => {
    expect(pictureOfDay([], new Date(2026, 9, 9, 10, 41))).toBeUndefined();
  });

  it("TODAY-07 the same local day always picks the same photo", () => {
    const morning = pictureOfDay(photos, new Date(2026, 9, 9, 0, 1));
    const night = pictureOfDay(photos, new Date(2026, 9, 9, 23, 59));

    expect(night).toBe(morning);
  });

  it("TODAY-07 the input order doesn't change the pick", () => {
    const now = new Date(2026, 9, 9, 10, 41);

    expect(pictureOfDay([...photos].reverse(), now)).toBe(pictureOfDay(photos, now));
  });

  it("TODAY-07 consecutive days step through the photos oldest upload first", () => {
    const days = [9, 10, 11, 12].map((d) => pictureOfDay(photos, new Date(2026, 9, d, 12))?.id);

    expect(days).toEqual(["c", "a", "b", "c"]);
  });
});
