import type { CalendarEvent } from "./schemas";
import { atMinute, minutesOfDay } from "./time";
import { dateKey } from "./zone";

type RibbonEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

export type RibbonSegment = { start: number; width: number };

export type RibbonLabel = "start" | "center" | "end";

export type RibbonSunset = { at: number; below: boolean };

export type DayRibbon = {
  elapsed: number;
  label: RibbonLabel;
  left: number;
  sunset?: RibbonSunset;
  ended: RibbonSegment[];
};

export const RIBBON_START = 5 * 60;

export const RIBBON_END = 21 * 60;

const MIN_SEGMENT = 20;

const SUNSET_CLEARANCE = 15;

const LABEL_EDGE = 20;

const LABEL_WIDTH = 42;

const LABEL_MARGIN = 4;

const LABEL_SPAN: Record<RibbonLabel, [number, number]> = {
  start: [0, LABEL_WIDTH],
  center: [-LABEL_WIDTH / 2, LABEL_WIDTH / 2],
  end: [-LABEL_WIDTH, 0],
};

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

  const elapsed = percent(minutes);

  const label = labelAlign(elapsed);

  return {
    elapsed,
    label,
    left: Math.max(0, RIBBON_END - minutes),
    ...sunsetTick(sunset, minutes, tz, label),
    ended,
  };
}

function labelAlign(elapsed: number): RibbonLabel {
  if (elapsed < LABEL_EDGE) return "start";

  return elapsed > 100 - LABEL_EDGE ? "end" : "center";
}

function sunsetTick(
  sunset: Date | undefined,
  now: number,
  tz: string,
  label: RibbonLabel,
): { sunset?: RibbonSunset } {
  if (sunset === undefined) return {};

  const minutes = minutesOfDay(sunset, tz);

  if (minutes < RIBBON_START || minutes > RIBBON_END) return {};

  if (Math.abs(minutes - now) <= SUNSET_CLEARANCE) return {};

  const at = percent(minutes);

  const elapsed = percent(now);

  const [from, to] = LABEL_SPAN[label];

  return {
    sunset: {
      at,
      below: at > elapsed + from - LABEL_MARGIN && at < elapsed + to + LABEL_MARGIN,
    },
  };
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
