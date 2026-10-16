import { type PhotoRow, pictureOfDay } from "./pictureOfDay";
import { addDays, calendarDate, zonedInstant } from "./zone";

const tz = "America/Los_Angeles";

const SEED = "00000004-0000-4000-8000-000000000001";

const noon = (key: string) => zonedInstant(tz, calendarDate(key), 12 * 60).toISOString();

const photo = (
  id: string,
  uploadedOn: string,
  extra: Partial<Omit<PhotoRow, "id">> = {},
): PhotoRow => ({
  id,
  title: id,
  takenOn: "2026-06-01",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  createdAt: noon(uploadedOn),
  ...extra,
});

const pickOn = (photos: readonly PhotoRow[], key: string, seed = SEED) =>
  pictureOfDay(photos, key, tz, seed)?.photo.id;

const daysFrom = (first: string, count: number) =>
  Array.from({ length: count }, (_, n) => addDays(first, n));

const five = ["a", "b", "c", "d", "e"].map((id) => photo(id, "2026-09-01"));

describe("pictureOfDay", () => {
  it("TODAY-07 no photos means no picture", () => {
    expect(pictureOfDay([], "2026-10-09", tz, SEED)).toBeUndefined();
  });

  it("TODAY-07 the first upload shows on its own day", () => {
    expect(pickOn([photo("a", "2026-10-09")], "2026-10-09")).toBe("a");
  });

  it("TODAY-07 every photo shows once per cycle before any repeats", () => {
    const cycles = [0, 5, 10].map((start) =>
      daysFrom(addDays("2026-09-01", start), 5).map((key) => pickOn(five, key)),
    );

    for (const cycle of cycles) expect([...cycle].sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("TODAY-07 a later cycle is shuffled, not upload order", () => {
    const seeds = ["one", "two", "three", "four", "five"];

    const orders = seeds.map((seed) =>
      daysFrom("2026-09-06", 5)
        .map((key) => pickOn(five, key, seed))
        .join(""),
    );

    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it("TODAY-07 photos uploaded on the first day show in upload order", () => {
    const sameDay = ["a", "b", "c"].map((id, n) =>
      photo(id, "2026-10-01", { createdAt: `2026-10-01T2${n}:00:00.000Z` }),
    );

    expect(daysFrom("2026-10-01", 3).map((key) => pickOn(sameDay, key))).toEqual(["a", "b", "c"]);
  });

  it("TODAY-07 a photo uploaded mid-cycle joins the end of it", () => {
    const late = photo("late", "2026-09-07");

    const cycle = daysFrom("2026-09-06", 6).map((key) => pickOn([...five, late], key));

    expect(cycle.slice(0, 5).sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(cycle[5]).toBe("late");
  });

  it("TODAY-07 an upload doesn't change the pick of the day it lands on", () => {
    const before = pickOn(five, "2026-09-07");

    expect(pickOn([...five, photo("new", "2026-09-07")], "2026-09-07")).toBe(before);
  });

  it("TODAY-07 today's photo deleted means the next one in the cycle", () => {
    const days = daysFrom("2026-09-06", 5);

    const order = days.map((key) => pickOn(five, key));

    const deleted = five.map((row) =>
      row.id === order[2] ? { ...row, deletedAt: noon(days[2] ?? "") } : row,
    );

    expect(pickOn(deleted, days[2] ?? "")).toBe(order[3]);
    expect(days.slice(0, 2).map((key) => pickOn(deleted, key))).toEqual(order.slice(0, 2));
  });

  it("TODAY-07 a later deletion doesn't change the past days' picks", () => {
    const days = daysFrom("2026-09-06", 5);

    const order = days.map((key) => pickOn(five, key));

    const deleted = five.map((row) =>
      row.id === order[1] ? { ...row, deletedAt: noon("2026-09-20") } : row,
    );

    expect(days.map((key) => pickOn(deleted, key))).toEqual(order);
  });

  it("TODAY-07 two screens of the account pick the same photo whatever their row order", () => {
    const key = "2026-09-08";

    expect(pickOn([...five].reverse(), key)).toBe(pickOn(five, key));
  });

  it("TODAY-07 On this day picks a photo taken on today's date in an earlier year", () => {
    const old = photo("old", "2026-09-01", { takenOn: "2024-09-04" });

    expect(pictureOfDay([...five, old], "2026-09-04", tz, SEED)).toEqual({
      photo: old,
      onThisDay: 2024,
    });
  });

  it("TODAY-07 On this day prefers the oldest year, then the oldest upload", () => {
    const rows = [
      photo("y25", "2026-09-01", { takenOn: "2025-09-04" }),
      photo("y23b", "2026-09-01", { takenOn: "2023-09-04", createdAt: "2026-09-01T21:00:00.000Z" }),
      photo("y23a", "2026-09-01", { takenOn: "2023-09-04", createdAt: "2026-09-01T20:00:00.000Z" }),
    ];

    expect(pickOn(rows, "2026-09-04")).toBe("y23a");
  });

  it("TODAY-07 a photo taken earlier this year isn't On this day", () => {
    const thisYear = photo("now", "2026-09-01", { takenOn: "2026-09-04" });

    expect(pictureOfDay([thisYear], "2026-09-04", tz, SEED)?.onThisDay).toBeUndefined();
  });

  it("TODAY-07 a deleted photo isn't On this day", () => {
    const old = photo("old", "2026-09-01", {
      takenOn: "2024-09-04",
      deletedAt: noon("2026-09-03"),
    });

    expect(pictureOfDay([...five, old], "2026-09-04", tz, SEED)?.onThisDay).toBeUndefined();
  });

  it("TODAY-07 an On this day day doesn't use up a cycle turn", () => {
    const days = daysFrom("2026-09-01", 14);

    const withOld = (takenOn: string) => [...five, photo("old", "2026-09-01", { takenOn })];

    const plain = days.map((key) => pickOn(withOld("2024-01-01"), key));

    const onThisDay = days.map((key) => pickOn(withOld("2024-09-08"), key));

    expect(onThisDay[7]).toBe("old");
    expect(onThisDay.toSpliced(7, 1)).toEqual(plain.slice(0, 13));
  });

  it("LOC-06 the day is the date in the location's zone", () => {
    const lateEvening = five.map((row) => ({ ...row, createdAt: "2026-09-02T06:30:00.000Z" }));

    expect(pictureOfDay(lateEvening, "2026-09-01", tz, SEED)?.photo.id).toBe("a");
    expect(pictureOfDay(lateEvening, "2026-09-01", "UTC", SEED)).toBeUndefined();
  });
});
