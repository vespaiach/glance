import { changeBackground, pickPhoto, rotationStep, shownBackground } from "./background";
import { DEFAULT_SETTINGS } from "./defaults";
import type { AccountSettings, Photo } from "./schemas";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

type Background = AccountSettings["background"];

const photo = (n: number, title: string, createdAt: string): Photo => ({
  id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  title,
  takenOn: "2026-09-06",
  createdAt,
});

const TRAIL = photo(1, "Forest Park trail", "2026-10-01T19:00:00.000Z");

const APPLES = photo(2, "Apple picking", "2026-10-03T19:00:00.000Z");

const COAST = photo(3, "Cannon Beach", "2026-10-05T19:00:00.000Z");

const PHOTOS = [TRAIL, APPLES, COAST];

const NOW = new Date(2026, 9, 9, 10, 30);

const background = (change: Partial<Background>): Background => ({
  ...DEFAULT_SETTINGS.background,
  ...change,
});

const slideshow = (rotate: Background["rotate"], photoId = TRAIL.id) =>
  background({ mode: "slideshow", rotate, photoId });

const shownTitle = (bg: Background, photos: readonly Photo[], now: Date) => {
  const shown = shownBackground(bg, photos, now, tz);

  return shown.mode === "season" ? undefined : shown.photo.title;
};

test("BG-05 Season color mode shows the season palette", () => {
  expect(
    shownBackground(background({ mode: "season", photoId: COAST.id }), PHOTOS, NOW, tz),
  ).toEqual({
    mode: "season",
  });
});

test("BG-05 with no photos every mode shows the season palette", () => {
  expect(shownBackground(background({ mode: "photo" }), [], NOW, tz)).toEqual({ mode: "season" });
  expect(shownBackground(background({ mode: "slideshow" }), [], NOW, tz)).toEqual({
    mode: "season",
  });
});

test("BG-05 Photo mode shows the chosen photo at any time", () => {
  const chosen = background({ mode: "photo", photoId: APPLES.id });

  expect(shownBackground(chosen, PHOTOS, NOW, tz)).toEqual({ mode: "photo", photo: APPLES });
  expect(shownBackground(chosen, PHOTOS, new Date(2026, 11, 25, 3), tz)).toEqual({
    mode: "photo",
    photo: APPLES,
  });
});

test("BG-05 a missing or unknown photo falls back to the oldest upload, whatever the list order", () => {
  const newestFirst = [COAST, APPLES, TRAIL];

  expect(shownBackground(background({ mode: "photo" }), newestFirst, NOW, tz)).toEqual({
    mode: "photo",
    photo: TRAIL,
  });
  expect(
    shownBackground(background({ mode: "photo", photoId: "gone" }), newestFirst, NOW, tz),
  ).toEqual({ mode: "photo", photo: TRAIL });
});

test("BG-06 rotationStep counts local hours, days and Sunday-start weeks", () => {
  const thursdayMidnight = new Date(1970, 0, 1);

  expect(rotationStep("hourly", thursdayMidnight, tz)).toBe(0);
  expect(rotationStep("hourly", new Date(1970, 0, 2, 5, 59), tz)).toBe(29);
  expect(rotationStep("daily", new Date(1970, 0, 3, 23, 59), tz)).toBe(2);
  expect(rotationStep("weekly", new Date(1970, 0, 3, 23, 59), tz)).toBe(0);
  expect(rotationStep("weekly", new Date(1970, 0, 4), tz)).toBe(1);
});

test("SET-03 Slideshow mode carries the shown photo and its interval", () => {
  const anchored = changeBackground(slideshow("weekly"), PHOTOS, { photoId: APPLES.id }, NOW, tz);

  expect(shownBackground(anchored, PHOTOS, NOW, tz)).toEqual({
    mode: "slideshow",
    photo: APPLES,
    rotate: "weekly",
  });
});

test("BG-06 Slideshow steps to the next upload each interval and wraps", () => {
  const start = changeBackground(slideshow("hourly"), PHOTOS, { photoId: TRAIL.id }, NOW, tz);

  const at = (hours: number) => new Date(2026, 9, 9, 10 + hours, 0);

  expect([0, 1, 2, 3].map((hours) => shownTitle(start, PHOTOS, at(hours)))).toEqual([
    "Forest Park trail",
    "Apple picking",
    "Cannon Beach",
    "Forest Park trail",
  ]);
});

test("BG-06 a daily slideshow changes at local midnight, a weekly one on Sunday", () => {
  const daily = changeBackground(slideshow("daily"), PHOTOS, { photoId: TRAIL.id }, NOW, tz);

  const weekly = changeBackground(slideshow("weekly"), PHOTOS, { photoId: TRAIL.id }, NOW, tz);

  expect(shownTitle(daily, PHOTOS, new Date(2026, 9, 9, 23, 59))).toBe("Forest Park trail");
  expect(shownTitle(daily, PHOTOS, new Date(2026, 9, 10, 0, 0))).toBe("Apple picking");
  expect(shownTitle(weekly, PHOTOS, new Date(2026, 9, 10, 23, 59))).toBe("Forest Park trail");
  expect(shownTitle(weekly, PHOTOS, new Date(2026, 9, 11, 0, 0))).toBe("Apple picking");
});

test("BG-06 Slideshow order is upload order, not the order photos are listed in", () => {
  const start = changeBackground(slideshow("daily"), PHOTOS, { photoId: TRAIL.id }, NOW, tz);

  const tomorrow = new Date(2026, 9, 10, 9);

  expect(shownTitle(start, [COAST, APPLES, TRAIL], tomorrow)).toBe("Apple picking");
});

test("BG-03 picking a photo in Slideshow shows it now and rotates on from it", () => {
  const picked = changeBackground(slideshow("daily"), PHOTOS, { photoId: COAST.id }, NOW, tz);

  expect(picked.mode).toBe("slideshow");
  expect(shownTitle(picked, PHOTOS, NOW)).toBe("Cannon Beach");
  expect(shownTitle(picked, PHOTOS, new Date(2026, 9, 10, 9))).toBe("Forest Park trail");
});

test("BG-06 changing the interval keeps the photo on screen", () => {
  const daily = changeBackground(slideshow("daily"), PHOTOS, { photoId: APPLES.id }, NOW, tz);

  const hourly = changeBackground(daily, PHOTOS, { rotate: "hourly" }, NOW, tz);

  expect(hourly.rotate).toBe("hourly");
  expect(shownTitle(hourly, PHOTOS, NOW)).toBe("Apple picking");
});

test("BG-06 switching between Photo and Slideshow keeps the photo on screen", () => {
  const photoMode = background({ mode: "photo", photoId: COAST.id });

  const toSlideshow = changeBackground(photoMode, PHOTOS, { mode: "slideshow" }, NOW, tz);

  const later = new Date(2026, 9, 11, 9);

  const backToPhoto = changeBackground(toSlideshow, PHOTOS, { mode: "photo" }, later, tz);

  expect(shownTitle(toSlideshow, PHOTOS, NOW)).toBe("Cannon Beach");
  expect(shownTitle(toSlideshow, PHOTOS, later)).toBe("Apple picking");
  expect(backToPhoto).toEqual(background({ mode: "photo", photoId: APPLES.id }));
});

test("BG-05 Season color keeps the last photo for when a photo mode returns", () => {
  const photoMode = background({ mode: "photo", photoId: COAST.id });

  const season = changeBackground(photoMode, PHOTOS, { mode: "season" }, NOW, tz);

  expect(season).toEqual(background({ mode: "season", photoId: COAST.id }));
  expect(changeBackground(season, PHOTOS, { mode: "photo" }, NOW, tz).photoId).toBe(COAST.id);
});

test("BG-04 changing the dim leaves the photo alone", () => {
  const photoMode = background({ mode: "photo", photoId: COAST.id });

  expect(changeBackground(photoMode, PHOTOS, { dim: 0.4 }, NOW, tz)).toEqual({
    ...photoMode,
    dim: 0.4,
  });
});

test("BG-03 picking a photo in Season color switches to Photo", () => {
  expect(pickPhoto("season", APPLES.id)).toEqual({ mode: "photo", photoId: APPLES.id });
});

test("BG-03 picking a photo keeps Photo or Slideshow mode", () => {
  expect(pickPhoto("photo", APPLES.id)).toEqual({ mode: "photo", photoId: APPLES.id });
  expect(pickPhoto("slideshow", APPLES.id)).toEqual({ mode: "slideshow", photoId: APPLES.id });
});

describe("rotation in a zone", () => {
  const LA = "America/Los_Angeles";
  const friday = new Date("2026-10-10T06:30:00Z");
  const fridayNumber = Date.UTC(2026, 9, 9) / 86_400_000;

  it("BG-04 daily and hourly steps count days and hours in the given zone", () => {
    expect(rotationStep("daily", friday, LA)).toBe(fridayNumber);
    expect(rotationStep("hourly", friday, LA)).toBe(fridayNumber * 24 + 23);
  });
});
