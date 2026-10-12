import type { Weather } from "./schemas";
import { localDateKey } from "./time";

type DailyPoint = Weather["daily"][number];

const NOTABLE_PRECIP = 50;

const LOOKAHEAD_DAYS = 6;

export function nextNotableDay(daily: readonly DailyPoint[], now: Date): DailyPoint | undefined {
  const today = localDateKey(now);

  const upcoming = daily.filter((day) => day.date > today).slice(0, LOOKAHEAD_DAYS);

  return upcoming.find((day) => (day.precip ?? 0) >= NOTABLE_PRECIP);
}
