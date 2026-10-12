import { shellOptions } from "./fixtureOptions";

const NOW = new Date("2026-10-09T10:41:00");

test("TIME-03 now= freezes the shell clock", () => {
  expect(shellOptions({ now: NOW }).frozenAt).toBe(NOW);
});

test("SET-02 clock= and season= override the saved settings", () => {
  expect(shellOptions({ clock: "24h", season: "winter" }).overrides).toEqual({
    clock: "24h",
    season: "winter",
  });
});

test("OFF-01 net=offline shows the offline pill at once", () => {
  expect(shellOptions({ net: "offline" }).pillDelayMs).toBe(0);
  expect(shellOptions({ net: "loading" }).pillDelayMs).toBeUndefined();
});

test("tech§4.3 no fixture params leave every provider on its defaults", () => {
  expect(shellOptions({})).toEqual({ overrides: {} });
});
