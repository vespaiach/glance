"use client";

import * as stylex from "@stylexjs/stylex";
import { useSearchParams } from "next/navigation";
import { useReducer } from "react";
import { copy } from "@/copy";
import {
  useEventsBetween,
  useEventsInWeek,
  useEventsOnDay,
  useHasEvents,
  useTags,
  useWeather,
} from "@/data/repos";
import { slotTimes } from "@/domain/eventTimes";
import type { AccountSettings, CalendarEvent, Tag, Weather } from "@/domain/schemas";
import { type EventWho, filterTagIds, liveFilter, matchesFilter } from "@/domain/tags";
import { displayTemp } from "@/domain/temperature";
import { formatLongDate, formatMonth, formatWeekday } from "@/domain/time";
import { outsideDay } from "@/domain/timeline";
import { hourlyByHour } from "@/domain/weather";
import {
  dayCounts,
  type PickerMonth,
  pickerMonths,
  readDateParam,
  weekDays,
  weekDots,
  weekHeading,
} from "@/domain/week";
import { addDays, dateKey, parseDateKey } from "@/domain/zone";
import { useBreakpoint, useViewportWidth } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useWhoFilter } from "@/shell/providers/whoFilter";
import { eventSheet, useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone, useWeatherZone } from "@/shell/sourceZone";
import type { TimelineWeather } from "@/ui/DayTimeline";
import { calendarView, initialCalendarView } from "./calendarView";
import { CalendarDay } from "./components/CalendarDay";
import { CalendarHeader } from "./components/CalendarHeader";
import { CalendarToolbar } from "./components/CalendarToolbar";
import { DatePicker, type PickerMonthView } from "./components/DatePicker";
import { SpanLink } from "./components/SpanLink";
import { type WeekDay, WeekStrip } from "./components/WeekStrip";
import { addEventPill, calendarLayout, pickerCell } from "./layout";

const NO_MEMBERS: Tag[] = [];

export function CalendarScreen() {
  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const windowWidth = useViewportWidth();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const searchParams = useSearchParams();

  const [view, dispatch] = useReducer(
    calendarView,
    readDateParam(searchParams.get("date")),
    initialCalendarView,
  );

  const today = dateKey(now, tz);

  const day = view.day ?? today;

  const week = weekDays(day);

  const who = useWhoFilter();

  const tags = useTags() ?? NO_MEMBERS;

  const allIds = tags.map((tag) => tag.id);

  const filter = liveFilter(who.filter, allIds);

  const events = useEventsOnDay(day, tz);

  const weekEvents = useEventsInWeek(week[0] ?? day, tz);

  const hasEvents = useHasEvents();

  const dayEvents = useSyncedZone(hasEvents === undefined ? undefined : events);

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const forecast = weather.state.kind === "ready" ? weather.state.data[0] : undefined;

  const shownTimed = (events ?? []).filter(
    (event) => !event.allDay && matchesFilter(event, filter, allIds),
  );

  const heading = weekHeading(day, today);

  const addEvent = () => sheets.open(newEvent(day, filterTagIds(filter, allIds)));

  const small = breakpoint === "small";

  const strip = {
    range: copy.calendar.weekRange(heading),
    month: heading.month,
    label: weekLabel(week[0] ?? day),
    days: weekPills(week, weekEvents ?? [], tags, { tz, forecast, settings }),
    selected: day,
    today,
    onPrevious: () => dispatch({ type: "step", delta: -1, today }),
    onNext: () => dispatch({ type: "step", delta: 1, today }),
    onSelect: (chosen: string) => dispatch({ type: "select", day: chosen }),
    onAddEvent: addEvent,
  };

  return (
    <div {...stylex.props(calendarLayout(breakpoint, view.span24))}>
      {small ? (
        <CalendarHeader
          {...strip}
          pickLabel={copy.calendar.pickDateFor(formatLongDate(parseDateKey(day), "UTC"))}
          onOpenPicker={() => dispatch({ type: "openPicker" })}
        />
      ) : (
        <WeekStrip
          {...strip}
          wide={addEventPill(windowWidth)}
          previousLabel={copy.calendar.previousWeek}
          nextLabel={copy.calendar.nextWeek}
        />
      )}
      <CalendarDay
        state={dayEvents.state}
        retryIn={dayEvents.retryIn}
        onRetry={dayEvents.retry}
        calendarEmpty={hasEvents === false}
        tags={tags}
        filter={filter}
        day={day}
        now={now}
        tz={tz}
        clock={settings.clock}
        breakpoint={breakpoint}
        span24={view.span24}
        weather={timelineWeather(forecast, day, tz, settings.tempUnit)}
        onOpenEvent={(event) => sheets.open(eventSheet(event, tz))}
        onAddEvent={(slot) =>
          sheets.open({
            ...newEvent(day, filterTagIds(filter, allIds)),
            times: slotTimes(slot, tz),
          })
        }
        toolbar={
          <CalendarToolbar
            tags={tags}
            filter={filter}
            small={small}
            onFilter={who.setFilter}
            {...(day !== today && { onToday: () => dispatch({ type: "select", day: today }) })}
          />
        }
        spanLink={
          <SpanLink
            on={view.span24}
            outside={outsideDay(shownTimed, tz)}
            clock={settings.clock}
            onToggle={() => dispatch({ type: "toggleSpan" })}
          />
        }
      />
      {small && view.picker && (
        <PhoneDatePicker
          selected={day}
          today={today}
          tz={tz}
          cell={pickerCell(windowWidth)}
          onSelect={(chosen) => dispatch({ type: "select", day: chosen })}
          onClose={() => dispatch({ type: "closePicker" })}
        />
      )}
    </div>
  );
}

type PhoneDatePickerProps = {
  selected: string;
  today: string;
  tz: string;
  cell: number;
  onSelect: (day: string) => void;
  onClose: () => void;
};

function PhoneDatePicker({ selected, today, tz, cell, onSelect, onClose }: PhoneDatePickerProps) {
  const months = pickerMonths(today);

  const first = months[0]?.days[0] ?? today;

  const last = months.at(-1)?.days.at(-1) ?? today;

  const events = useEventsBetween(first, addDays(last, 1), tz);

  return (
    <DatePicker
      months={pickerViews(months, dayCounts(events ?? [], tz))}
      selected={selected}
      today={today}
      cell={cell}
      onSelect={onSelect}
      onToday={() => onSelect(today)}
      onClose={onClose}
    />
  );
}

type PillContext = {
  tz: string;
  forecast: Weather | undefined;
  settings: Pick<AccountSettings, "tempUnit">;
};

function newEvent(day: string, who: EventWho) {
  return { kind: "newevent" as const, day, who };
}

function weekLabel(sunday: string): string {
  const date = parseDateKey(sunday);

  return copy.calendar.week(formatMonth(date, "UTC"), date.getUTCDate());
}

function pickerViews(
  months: readonly PickerMonth[],
  counts: ReadonlyMap<string, number>,
): PickerMonthView[] {
  return months.map((month) => ({
    ...month,
    days: month.days.map((key) => {
      const date = parseDateKey(key);

      return {
        key,
        date: date.getUTCDate(),
        name: formatLongDate(date, "UTC"),
        marked: counts.has(key),
      };
    }),
  }));
}

function weekPills(
  week: readonly string[],
  events: readonly CalendarEvent[],
  tags: readonly Tag[],
  { tz, forecast, settings }: PillContext,
): WeekDay[] {
  const dots = weekDots(events, tags, tz);

  const counts = dayCounts(events, tz);

  return week.map((key) => {
    const date = parseDateKey(key);

    const weekday = formatWeekday(date, "UTC");

    const daily = forecast?.daily.find((point) => point.date === key);

    return {
      key,
      weekday,
      date: date.getUTCDate(),
      name: formatLongDate(date, "UTC"),
      count: dayCount(counts.get(key)),
      dots: dots.get(key) ?? [],
      ...(daily && {
        forecast: {
          icon: daily.icon,
          label: copy.weather.icon[daily.icon],
          high: `${displayTemp(daily.high, settings.tempUnit)}°`,
        },
      }),
    };
  });
}

function dayCount(count: number | undefined): string | undefined {
  return count ? copy.calendar.eventCount(count) : undefined;
}

function timelineWeather(
  forecast: Weather | undefined,
  day: string,
  tz: string,
  unit: AccountSettings["tempUnit"],
): TimelineWeather | undefined {
  if (!forecast) return undefined;

  return hourlyByHour(forecast.hourly, day, tz).size > 0
    ? { hourly: forecast.hourly, unit }
    : undefined;
}
