import type { AccountSettings, Season } from "./schemas";
import { wallTime } from "./zone";

function seasonOfMonth(month: number): Season {
  if (month < 2 || month === 11) return "winter";

  if (month < 5) return "spring";

  return month < 8 ? "summer" : "fall";
}

export function seasonFor(setting: AccountSettings["season"], now: Date, tz: string): Season {
  return setting === "auto" ? seasonOfMonth(wallTime(now, tz).month - 1) : setting;
}
