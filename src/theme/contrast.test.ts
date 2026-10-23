import { readFileSync } from "node:fs";
import path from "node:path";

const AA = 4.5;

const AMBIENT_DIM = 0.6;

const AMBIENT_INKS = ["white", "ambientInkMedium", "ambientInkLow"];

const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");

const tokens = source("tokens.stylex.ts");

const seasons = {
  spring: source("seasons.stylex.ts"),
  ...Object.fromEntries(
    source("themes.ts")
      .split("export const ")
      .slice(1)
      .filter((chunk) => chunk.includes("createTheme(season,"))
      .map((chunk) => [chunk.slice(0, chunk.indexOf(" ")), chunk]),
  ),
};

function hexOf(token: string) {
  const match = tokens.match(new RegExp(`(?:const |\\b)${token}(?: =|:) "(#[0-9a-f]{6})"`));

  const hex = match?.[1];

  if (!hex) throw new Error(`no hex for ${token}`);

  return hex;
}

function seasonColor(season: string, role: string) {
  const match = seasons[season as keyof typeof seasons].match(
    new RegExp(`${role}: colors\\.(\\w+)`),
  );

  const token = match?.[1];

  if (!token) throw new Error(`no ${role} in ${season}`);

  return hexOf(token);
}

function channel(value: number) {
  const srgb = value / 255;

  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

const WEIGHTS = [
  [1, 0.2126],
  [3, 0.7152],
  [5, 0.0722],
] as const;

function luminance(hex: string) {
  return WEIGHTS.reduce(
    (sum, [start, weight]) =>
      sum + weight * channel(Number.parseInt(hex.slice(start, start + 2), 16)),
    0,
  );
}

function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)];

  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function gray(level: number) {
  const hex = Math.round(level).toString(16).padStart(2, "0");

  return `#${hex}${hex}${hex}`;
}

const SEASONS = ["spring", "summer", "fall", "winter"];

const BLOCKS = ["block1", "block2", "block3", "block4", "soft"];

test("A11Y-05 the check reads all four seasons", () => {
  expect(Object.keys(seasons).sort()).toEqual([...SEASONS].sort());
});

test.each(SEASONS)("A11Y-05 black text reads at AA on every %s block", (season) => {
  for (const block of BLOCKS) {
    expect(contrast(hexOf("black"), seasonColor(season, block))).toBeGreaterThanOrEqual(AA);
  }
});

test.each(SEASONS)("A11Y-05 %s text on deep and on accent reads at AA", (season) => {
  expect(
    contrast(seasonColor(season, "onDeep"), seasonColor(season, "deep")),
  ).toBeGreaterThanOrEqual(AA);
  expect(
    contrast(seasonColor(season, "onAccent"), seasonColor(season, "accent")),
  ).toBeGreaterThanOrEqual(AA);
});

test("A11Y-05 black text on white panels and soft surfaces, and the danger caption, read at AA", () => {
  for (const surface of ["white", "surfaceSoftBase", "hairline"]) {
    expect(contrast(hexOf("black"), hexOf(surface))).toBeGreaterThanOrEqual(AA);
  }

  expect(contrast(hexOf("danger"), hexOf("white"))).toBeGreaterThanOrEqual(AA);
});

test("AMB-06 white text over the brightest photo under the Ambient dim reads at AA", () => {
  expect(contrast(hexOf("white"), gray(255 * (1 - AMBIENT_DIM)))).toBeGreaterThanOrEqual(AA);
});

test.each(SEASONS)("AMB-06 every Brightness ink reads at AA on the %s deep color", (season) => {
  for (const ink of AMBIENT_INKS) {
    expect(contrast(hexOf(ink), seasonColor(season, "deep"))).toBeGreaterThanOrEqual(AA);
  }
});
