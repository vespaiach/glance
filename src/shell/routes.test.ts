import { VIEWS, viewForPath, viewPath } from "./routes";

test("SHELL-01 the bar's views are Today, Calendar, Weather, Notes, Photos, then Settings", () => {
  expect(VIEWS).toEqual(["today", "calendar", "weather", "notes", "photos", "settings"]);
  expect(VIEWS.map(viewPath)).toEqual([
    "/today",
    "/calendar",
    "/weather",
    "/notes",
    "/photos",
    "/settings",
  ]);
});

test("SHELL-02 each view's route makes it the active view", () => {
  expect(viewForPath("/today")).toBe("today");
  expect(viewForPath("/calendar")).toBe("calendar");
});

test("SHELL-02 Settings stays active on Background", () => {
  expect(viewForPath("/settings/background")).toBe("settings");
});

test("SHELL-03 Sign in and Ambient have no active view", () => {
  expect(viewForPath("/signin")).toBeUndefined();
  expect(viewForPath("/ambient")).toBeUndefined();
});
