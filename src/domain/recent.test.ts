import { recentPlaces, recentTitles } from "./recent";

const event = (title: string, location: string | undefined, updatedAt: string) => ({
  title,
  ...(location === undefined ? {} : { location }),
  updatedAt,
});

const EVENTS = [
  event("Swim", "Pool", "2026-10-01T10:00:00Z"),
  event("Piano", "Studio", "2026-10-05T10:00:00Z"),
  event("swim ", "pool", "2026-10-03T10:00:00Z"),
  event("Dentist", undefined, "2026-10-04T10:00:00Z"),
  event("  ", "  ", "2026-10-06T10:00:00Z"),
];

describe("recent titles and places", () => {
  it("EVT-12 recent titles are distinct, newest first, ignoring case and spaces", () => {
    expect(recentTitles(EVENTS)).toEqual(["Piano", "Dentist", "swim"]);
  });

  it("EVT-12 recent places are distinct, newest first, and skip events with no place", () => {
    expect(recentPlaces(EVENTS)).toEqual(["Studio", "pool"]);
  });

  it("EVT-12 at most 6 titles and 5 places", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      event(`T${i}`, `P${i}`, `2026-10-0${i + 1}T00:00:00Z`),
    );

    expect(recentTitles(many)).toEqual(["T8", "T7", "T6", "T5", "T4", "T3"]);
    expect(recentPlaces(many)).toEqual(["P8", "P7", "P6", "P5", "P4"]);
  });
});
