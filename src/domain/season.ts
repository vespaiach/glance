import type { AccountSettings, Season } from "./schemas";

function seasonOfMonth(month: number): Season {
  if (month < 2 || month === 11) return "winter";

  if (month < 5) return "spring";

  return month < 8 ? "summer" : "fall";
}

export function seasonFor(setting: AccountSettings["season"], now: Date): Season {
  return setting === "auto" ? seasonOfMonth(now.getMonth()) : setting;
}
