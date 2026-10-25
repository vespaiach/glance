import * as v from "valibot";
import { DEFAULT_SETTINGS } from "./defaults";
import { AccountSettingsSchema } from "./schemas";

describe("DEFAULT_SETTINGS", () => {
  it("spec§7.0 are Auto, 12-hour, Fahrenheit, Season color (Light, Daily), idle on · 3 min, notes on · 7 days, hide sidebar when idle, Medium ambient brightness, every night 6:00 PM – 7:30 AM, notifications 15 min before, chime on", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      season: "auto",
      clock: "12h",
      tempUnit: "F",
      background: { mode: "season", dim: 0.2, rotate: "daily" },
      idleTimeout: { on: true, minutes: 3 },
      noteExpiry: { on: true, days: 7 },
      hideSidebarWhenIdle: true,
      ambientBrightness: "medium",
      ambient: {
        mode: "same",
        all: { start: "18:00", end: "07:30" },
        wknd: { start: "21:00", end: "09:00" },
      },
      notifyLead: 15,
      chime: true,
    });
  });

  it("D6 pass the settings schema", () => {
    expect(v.safeParse(AccountSettingsSchema, DEFAULT_SETTINGS).success).toBe(true);
  });
});
