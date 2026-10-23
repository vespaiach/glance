import { fixtureSheetTargets } from "@/data/repos";
import { fixtureSheet, shellOptions } from "./fixtureOptions";

const NOW = new Date("2026-10-09T10:41:00");

test("TIME-03 now= freezes the shell clock", () => {
  expect(shellOptions({ now: NOW }, NOW).frozenAt).toBe(NOW);
});

test("SIGNIN-04 hold=1 freezes the shell clock at the moment it opens", () => {
  expect(shellOptions({ hold: true }, NOW).frozenAt).toBe(NOW);
});

test("TIME-03 now= wins over hold=1", () => {
  const opened = new Date("2026-10-20T08:00:00");

  expect(shellOptions({ now: NOW, hold: true }, opened).frozenAt).toBe(NOW);
});

test("SET-02 clock= and season= override the saved settings", () => {
  expect(shellOptions({ clock: "24h", season: "winter" }, NOW).overrides).toEqual({
    clock: "24h",
    season: "winter",
  });
});

test("AMB-06 bright= overrides the saved Ambient brightness", () => {
  expect(shellOptions({ bright: "low" }, NOW).overrides).toEqual({ ambientBrightness: "low" });
});

test("OFF-01 net=offline shows the offline pill at once", () => {
  expect(shellOptions({ net: "offline" }, NOW).pillDelayMs).toBe(0);
  expect(shellOptions({ net: "loading" }, NOW).pillDelayMs).toBeUndefined();
});

test("PHOTO-09 upload=offline shows the offline pill at once, as the frames do", () => {
  expect(shellOptions({ upload: "offline" }, NOW).pillDelayMs).toBe(0);
  expect(shellOptions({ upload: "error" }, NOW).pillDelayMs).toBeUndefined();
});

test("tech§4.3 no fixture params leave every provider on its defaults", () => {
  expect(shellOptions({}, NOW)).toEqual({ overrides: {} });
});

test("tech§6 sheet=event opens the fixture event with its time state", () => {
  expect(fixtureSheet({ sheet: "event", time: "error" }, "2026-10-09")).toEqual({
    kind: "event",
    id: fixtureSheetTargets.event,
    time: "error",
    edit: true,
  });
});

test("EVT-08 sheet=allday opens the all-day fixture event", () => {
  expect(fixtureSheet({ sheet: "allday" }, "2026-10-09")).toEqual({
    kind: "event",
    id: fixtureSheetTargets.allDay,
    edit: true,
  });
});

test("EVT-09 details=1 opens Event details on the event, all-day and past fixtures", () => {
  expect(fixtureSheet({ sheet: "event", details: true }, "2026-10-09")).toEqual({
    kind: "event",
    id: fixtureSheetTargets.event,
  });
  expect(fixtureSheet({ sheet: "allday", details: true }, "2026-10-09")).toEqual({
    kind: "event",
    id: fixtureSheetTargets.allDay,
  });
  expect(fixtureSheet({ sheet: "past", details: true }, "2026-10-09")).toEqual({
    kind: "event",
    id: fixtureSheetTargets.past,
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
    edit: true,
  });
  expect(fixtureSheet({ sheet: "newnote" }, "2026-10-09")).toEqual({
    kind: "newnote",
    draft: { text: "Has anyone seen my blue umbr" },
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
    edit: true,
    discard: true,
  });
});

test("NOTE-10 sheet=note&details=1 opens Note details", () => {
  expect(fixtureSheet({ sheet: "note", details: true }, "2026-10-09")).toEqual({
    kind: "note",
    id: fixtureSheetTargets.note,
  });
});

test("tech§6 no sheet= opens no sheet", () => {
  expect(fixtureSheet({ time: "start" }, "2026-10-09")).toBeNull();
});

test("PHOTO-12 sheet=photo and sheet=photometa open Photo details on the two uploaded photos", () => {
  expect(fixtureSheet({ sheet: "photo" }, "2026-10-09")).toEqual({
    kind: "photo",
    id: fixtureSheetTargets.photo,
  });
  expect(fixtureSheet({ sheet: "photometa", discard: true }, "2026-10-09")).toEqual({
    kind: "photo",
    id: fixtureSheetTargets.photoMeta,
    discard: true,
  });
});
