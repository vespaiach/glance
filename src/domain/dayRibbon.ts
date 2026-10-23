import type { CalendarEvent } from "./schemas";
import { atMinute, minutesOfDay } from "./time";
import { dateKey } from "./zone";

type RibbonEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

export type RibbonSegment = { start: number; width: number };

export type DayRibbon = {
  elapsed: number;
  left: number;
  sunset?: number;
  ended: RibbonSegment[];
};

export const RIBBON_START = 5 * 60;

export const RIBBON_END = 21 * 60;

const MIN_SEGMENT = 20;

const SPAN = RIBBON_END - RIBBON_START;

export function dayRibbon(
  events: readonly RibbonEvent[],
  now: Date,
  sunset: Date | undefined,
  tz: string,
): DayRibbon {
  const minutes = minutesOfDay(now, tz);

  const day = dateKey(now, tz);

  const ended = events.flatMap((event) => endedSegment(event, now, day, tz));

  return {
    elapsed: percent(minutes),
    left: Math.max(0, RIBBON_END - minutes),
    ...sunsetTick(sunset, tz),
    ended,
  };
}

function sunsetTick(sunset: Date | undefined, tz: string): { sunset?: number } {
  if (sunset === undefined) return {};

  const minutes = minutesOfDay(sunset, tz);

  if (minutes < RIBBON_START || minutes > RIBBON_END) return {};

  return { sunset: percent(minutes) };
}

function endedSegment(
  { startAt, endAt, allDay }: RibbonEvent,
  now: Date,
  day: string,
  tz: string,
): RibbonSegment[] {
  if (allDay || endAt === undefined || Date.parse(endAt) > now.getTime()) return [];

  const origin = atMinute(day, RIBBON_START, tz).getTime();

  const start = (Date.parse(startAt) - origin) / 60_000;

  const end = Math.max((Date.parse(endAt) - origin) / 60_000, start + MIN_SEGMENT);

  const from = clamp(start, SPAN);

  return [{ start: (from / SPAN) * 100, width: ((clamp(end, SPAN) - from) / SPAN) * 100 }];
}

function percent(minutes: number): number {
  return (clamp(minutes - RIBBON_START, SPAN) / SPAN) * 100;
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}
