import type { AccountSettings } from "./schemas";

export const DEFAULT_SETTINGS: AccountSettings = {
  season: "auto",
  clock: "12h",
  tempUnit: "F",
  background: { mode: "season", dim: 0.2, rotate: "daily" },
  idleTimeout: 180,
  noteExpiry: "1w",
  ambientHours: { start: "18:00", end: "07:30" },
};
