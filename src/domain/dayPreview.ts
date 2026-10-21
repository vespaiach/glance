import { eventDayKey } from "./allDay";
import type { EventTimes } from "./eventTimes";
import type { CalendarEvent, Weather } from "./schemas";
import { atMinute } from "./time";
import { type DailyPoint, dayForecast, type HourlyPoint, hourlyByHour } from "./weather";
import { addDays, dateKey, dayStart } from "./zone";

export type PreviewTimes = EventTimes & { allDay?: true };

export type PreviewWeather =
  | { kind: "day"; point: DailyPoint }
  | { kind: "hours"; hours: HourlyPoint[] };

type Planned = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

const MINUTE_MS = 60_000;

const NO_END_MINUTES = 30;

const MAX_HOURS = 6;

const RAIN_SHOWN = 30;

export function previewWindow(day: string, times: PreviewTimes, tz: string): [Date, Date] {
  if (times.allDay) return [dayStart(day, tz), dayStart(addDays(day, 1), tz)];

  const start = atMinute(day, times.start, tz);

  return [start, new Date(start.getTime() + previewMinutes(times) * MINUTE_MS)];
}

export function overlappingEvents<T extends Planned>(
  events: readonly T[],
  start: Date,
  end: Date,
  tz: string,
): T[] {
  const first = dateKey(start, tz);

  const last = dateKey(new Date(end.getTime() - 1), tz);

  const touches = (event: T) =>
    event.allDay
      ? withinDays(eventDayKey(event, tz), first, last)
      : overlapsRange(event, start, end);

  return events.filter(touches).sort(byAllDayThenStart);
}

export function previewWeather(
  weather: Pick<Weather, "hourly" | "daily"> | null | undefined,
  day: string,
  times: PreviewTimes,
  now: Date,
  tz: string,
): PreviewWeather | undefined {
  if (!weather) return undefined;

  const hours = times.allDay ? [] : coveredHours(weather.hourly, day, times, tz);

  if (hours.length > 0) return { kind: "hours", hours };

  const point = dayForecast(weather.daily, day, now, tz);

  return point && { kind: "day", point };
}

export function previewRain(hours: readonly HourlyPoint[]): number | undefined {
  const chance = Math.max(0, ...hours.map((point) => point.precip ?? 0));

  return chance >= RAIN_SHOWN ? chance : undefined;
}

function previewMinutes({ start, end }: EventTimes): number {
  return end !== undefined && end > start ? end - start : NO_END_MINUTES;
}

function withinDays(key: string, first: string, last: string): boolean {
  return key >= first && key <= last;
}

function overlapsRange(event: Planned, start: Date, end: Date): boolean {
  const from = Date.parse(event.startAt);

  const to = Math.max(Date.parse(event.endAt ?? event.startAt), from + MINUTE_MS);

  return from < end.getTime() && to > start.getTime();
}

function byAllDayThenStart(a: Planned, b: Planned): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;

  return Date.parse(a.startAt) - Date.parse(b.startAt);
}

function coveredHours(
  hourly: Weather["hourly"],
  day: string,
  times: EventTimes,
  tz: string,
): HourlyPoint[] {
  const byHour = hourlyByHour(hourly, day, tz);

  const first = Math.floor(times.start / 60);

  const last = Math.max(first + 1, Math.ceil((times.start + previewMinutes(times)) / 60));

  const step = Math.ceil((last - first) / MAX_HOURS);

  const points: (HourlyPoint | undefined)[] = [];

  for (let hour = first; hour < last; hour += step) points.push(byHour.get(hour));

  return points.filter((point) => point !== undefined);
}
