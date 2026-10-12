import type { Weather } from "./schemas";
import { dateKey } from "./zone";

type DailyPoint = Weather["daily"][number];

const NOTABLE_PRECIP = 50;

const LOOKAHEAD_DAYS = 6;

export function nextNotableDay(
  daily: readonly DailyPoint[],
  now: Date,
  tz: string,
): DailyPoint | undefined {
  const today = dateKey(now, tz);

  const upcoming = daily.filter((day) => day.date > today).slice(0, LOOKAHEAD_DAYS);

  return upcoming.find((day) => (day.precip ?? 0) >= NOTABLE_PRECIP);
}
