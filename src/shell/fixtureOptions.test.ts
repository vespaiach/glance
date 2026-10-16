import { fixtureSheetTargets } from "@/data/repos";
import { fixtureSheet, shellOptions } from "./fixtureOptions";

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

test("PHOTO-09 upload=offline shows the offline pill at once, as the frames do", () => {
  expect(shellOptions({ upload: "offline" }).pillDelayMs).toBe(0);
  expect(shellOptions({ upload: "error" }).pillDelayMs).toBeUndefined();
});

test("tech§4.3 no fixture params leave every provider on its defaults", () => {
  expect(shellOptions({})).toEqual({ overrides: {} });
});

test("tech§6 sheet=event opens the fixture event with its time state", () => {
  expect(fixtureSheet({ sheet: "event", time: "error" }, "2026-10-09")).toEqual({
    kind: "event",
    id: fixtureSheetTargets.event,
    time: "error",
  });
});

test("tech§6 sheet=newevent opens a new event on today", () => {
  expect(fixtureSheet({ sheet: "newevent" }, "2026-10-09")).toEqual({
    kind: "newevent",
    day: "2026-10-09",
  });
});

test("tech§6 sheet=note and sheet=newnote open the note sheets", () => {
  expect(fixtureSheet({ sheet: "note" }, "2026-10-09")).toEqual({
    kind: "note",
    id: fixtureSheetTargets.note,
  });
  expect(fixtureSheet({ sheet: "newnote" }, "2026-10-09")).toEqual({
    kind: "newnote",
    draft: { text: "Has anyone seen my blue umbr", tone: 2 },
  });
});

test("§8.9 discard=1 opens the sheet asking Discard changes?", () => {
  expect(fixtureSheet({ sheet: "newevent", discard: true }, "2026-10-09")).toEqual({
    kind: "newevent",
    day: "2026-10-09",
    discard: true,
  });
  expect(fixtureSheet({ sheet: "note", discard: true }, "2026-10-09")).toEqual({
    kind: "note",
    id: fixtureSheetTargets.note,
    discard: true,
  });
});

test("tech§6 no sheet= opens no sheet", () => {
  expect(fixtureSheet({ time: "start" }, "2026-10-09")).toBeNull();
});
