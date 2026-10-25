import { type AccountSettings, DEFAULT_AMBIENT } from "./schemas";

export const DEFAULT_SETTINGS: AccountSettings = {
  season: "auto",
  clock: "12h",
  tempUnit: "F",
  background: { mode: "season", dim: 0.2, rotate: "daily" },
  idleTimeout: { on: true, minutes: 3 },
  noteExpiry: { on: true, days: 7 },
  hideSidebarWhenIdle: true,
  ambientBrightness: "medium",
  ambient: DEFAULT_AMBIENT,
  notifyLead: 15,
  chime: true,
};
