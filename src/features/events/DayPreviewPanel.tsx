"use client";

import { copy } from "@/copy";
import { useEventsOnDay, useWeather } from "@/data/repos";
import {
  overlappingEvents,
  type PreviewTimes,
  previewRain,
  previewWeather,
  previewWindow,
} from "@/domain/dayPreview";
import type { CalendarEvent, Tag, Weather } from "@/domain/schemas";
import { whoLabel } from "@/domain/tags";
import { displayTemp } from "@/domain/temperature";
import {
  type Clock,
  clockAt,
  formatClock,
  formatDayTitle,
  formatHour,
  minutesOfDay,
} from "@/domain/time";
import { parseDateKey } from "@/domain/zone";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { DayPreview, type PreviewPlan, type PreviewTile } from "./components/DayPreview";

type PanelProps = {
  day: string;
  id: string;
  tags: readonly Tag[];
  times: PreviewTimes;
};

type TileInput = {
  weather: Weather | null | undefined;
  located: boolean;
  day: string;
  times: PreviewTimes;
  now: Date;
  tz: string;
  tempUnit: "F" | "C";
  clock: Clock;
};

const words = copy.events.preview;

export function DayPreviewPanel({ day, id, tags, times }: PanelProps) {
  const tz = useTimeZone();

  const now = useNow("minute");

  const { clock, tempUnit, weatherLocation } = useAccountSettings();

  const weather = useWeather();

  const events = useEventsOnDay(day, tz);

  if (!events) return null;

  const [start, end] = previewWindow(day, times, tz);

  const others = events.filter((event) => event.id !== id);

  return (
    <DayPreview
      label={words.label(formatDayTitle(parseDateKey(day), "UTC"), whenLabel(times, clock))}
      weather={previewTile({
        weather,
        located: weatherLocation !== undefined,
        day,
        times,
        now,
        tz,
        tempUnit,
        clock,
      })}
      plans={overlappingEvents(others, start, end, tz).map((event) =>
        previewPlan(event, tags, clock, tz),
      )}
    />
  );
}

function whenLabel({ start, end, allDay }: PreviewTimes, clock: Clock): string {
  if (allDay) return copy.events.allDay;

  const from = formatClock(start, clock);

  return end !== undefined && end > start ? `${from} – ${formatClock(end, clock)}` : from;
}

function previewTile({
  weather,
  located,
  day,
  times,
  now,
  tz,
  tempUnit,
  clock,
}: TileInput): PreviewTile | "none" | undefined {
  if (!located || weather === undefined) return undefined;

  const forecast = previewWeather(weather, day, times, now, tz);

  if (!forecast) return "none";

  const temp = (value: number) => `${displayTemp(value, tempUnit)}°`;

  if (forecast.kind === "day") {
    const { icon, high } = forecast.point;

    return {
      icon,
      temp: temp(high),
      condition: `${copy.weather.icon[icon]} · ${words.dayHigh}`,
      hours: [],
    };
  }

  const [first] = forecast.hours;

  if (!first) return "none";

  const rain = previewRain(forecast.hours);

  const condition = copy.weather.icon[first.icon];

  return {
    icon: first.icon,
    temp: temp(first.temp),
    condition: rain === undefined ? condition : `${condition} · ${words.rain(rain)}`,
    hours: forecast.hours.map((point) => {
      const time = formatHour(minutesOfDay(new Date(point.time), tz), clock);

      return {
        time,
        icon: point.icon,
        temp: temp(point.temp),
        label: words.hour(
          time,
          copy.weather.icon[point.icon],
          String(displayTemp(point.temp, tempUnit)),
        ),
      };
    }),
  };
}

function previewPlan(
  event: CalendarEvent,
  tags: readonly Tag[],
  clock: Clock,
  tz: string,
): PreviewPlan {
  return {
    id: event.id,
    time: planTime(event, clock, tz),
    title: event.title,
    who: whoLabel(event, tags, copy.events.everyone),
  };
}

function planTime(event: CalendarEvent, clock: Clock, tz: string): string {
  if (event.allDay) return copy.events.allDay;

  const from = clockAt(event.startAt, clock, tz);

  return event.endAt ? `${from} – ${clockAt(event.endAt, clock, tz)}` : from;
}
