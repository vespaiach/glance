import { pickPhoto, shownBackground } from "./background";
import { DEFAULT_SETTINGS } from "./defaults";
import type { AccountSettings, Photo } from "./schemas";

type Background = AccountSettings["background"];

const photo = (n: number, title: string): Photo => ({
  id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  title,
  takenOn: "2026-09-06",
  createdAt: "2026-10-05T19:00:00.000Z",
});

const COAST = photo(1, "Cannon Beach");

const APPLES = photo(2, "Apple picking");

const PHOTOS = [COAST, APPLES];

const background = (change: Partial<Background>): Background => ({
  ...DEFAULT_SETTINGS.background,
  ...change,
});

test("BG-05 Season color mode shows the season palette", () => {
  expect(shownBackground(background({ mode: "season", photoId: COAST.id }), PHOTOS)).toEqual({
    mode: "season",
  });
});

test("BG-05 with no photos every mode shows the season palette", () => {
  expect(shownBackground(background({ mode: "photo" }), [])).toEqual({ mode: "season" });
  expect(shownBackground(background({ mode: "slideshow" }), [])).toEqual({ mode: "season" });
});

test("BG-05 Photo mode shows the chosen photo", () => {
  expect(shownBackground(background({ mode: "photo", photoId: APPLES.id }), PHOTOS)).toEqual({
    mode: "photo",
    photo: APPLES,
  });
});

test("BG-05 a missing or unknown photo falls back to the first photo", () => {
  expect(shownBackground(background({ mode: "photo" }), PHOTOS)).toEqual({
    mode: "photo",
    photo: COAST,
  });
  expect(shownBackground(background({ mode: "photo", photoId: "gone" }), PHOTOS)).toEqual({
    mode: "photo",
    photo: COAST,
  });
});

test("SET-03 Slideshow mode carries the photo and its interval", () => {
  expect(
    shownBackground(
      background({ mode: "slideshow", photoId: APPLES.id, rotate: "weekly" }),
      PHOTOS,
    ),
  ).toEqual({ mode: "slideshow", photo: APPLES, rotate: "weekly" });
});

test("BG-03 picking a photo in Season color switches to Photo", () => {
  expect(pickPhoto("season", APPLES.id)).toEqual({ mode: "photo", photoId: APPLES.id });
});

test("BG-03 picking a photo keeps Photo or Slideshow mode", () => {
  expect(pickPhoto("photo", APPLES.id)).toEqual({ mode: "photo", photoId: APPLES.id });
  expect(pickPhoto("slideshow", APPLES.id)).toEqual({ mode: "slideshow", photoId: APPLES.id });
});
