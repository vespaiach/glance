import { type AccountSettings, DEFAULT_AMBIENT } from "./schemas";

export const DEFAULT_SETTINGS: AccountSettings = {
  season: "auto",
  clock: "12h",
  tempUnit: "F",
  background: { mode: "season", dim: 0.2, rotate: "daily" },
  idleTimeout: 180,
  noteExpiry: "1w",
  ambient: DEFAULT_AMBIENT,
};
