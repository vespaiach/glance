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
  useMembers,
  useWeather,
} from "@/data/repos";
import type { Breakpoint } from "@/domain/breakpoint";
import { filterMemberIds, liveFilter, matchesFilter } from "@/domain/members";
import type { AccountSettings, CalendarEvent, Member, Weather } from "@/domain/schemas";
import { displayTemp } from "@/domain/temperature";
import { formatLongDate, formatMonth, formatWeekday } from "@/domain/time";
import { outsideDay } from "@/domain/timeline";
import { hourlyByHour } from "@/domain/weather";
import {
  type Dot,
  type PickerMonth,
  pickerMonths,
  readDateParam,
  weekDays,
  weekDots,
  weekHeading,
} from "@/domain/week";
import { addDays, dateKey, parseDateKey } from "@/domain/zone";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone, useWeatherZone } from "@/shell/sourceZone";
import type { TimelineWeather } from "@/ui/DayTimeline";
import { calendarView, initialCalendarView } from "./calendarView";
import { CalendarDay } from "./components/CalendarDay";
import { CalendarToolbar } from "./components/CalendarToolbar";
import { DateControl } from "./components/DateControl";
import { DatePicker, type PickerMonthView } from "./components/DatePicker";
import { type WeekDay, WeekStrip } from "./components/WeekStrip";
import { calendarLayout } from "./layout";

const NO_MEMBERS: Member[] = [];

export function CalendarScreen() {
  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const searchParams = useSearchParams();

  const fixture = useFixtureParams();

  const [view, dispatch] = useReducer(
    calendarView,
    { date: readDateParam(searchParams.get("date")), fixture },
    initialCalendarView,
  );

  const today = dateKey(now, tz);

  const day = view.day ?? today;

  const week = weekDays(day);

  const members = useMembers() ?? NO_MEMBERS;

  const family = members.map((member) => member.id);

  const filter = liveFilter(view.filter, family);

  const events = useEventsOnDay(day, tz);

  const weekEvents = useEventsInWeek(week[0] ?? day, tz);

  const hasEvents = useHasEvents();

  const dayEvents = useSyncedZone(hasEvents === undefined ? undefined : events);

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const forecast = weather.state.kind === "ready" ? weather.state.data[0] : undefined;

  const shownTimed = (events ?? []).filter(
    (event) => !event.allDay && matchesFilter(event, filter),
  );

  return (
    <div {...stylex.props(calendarLayout(breakpoint, view.span24))}>
      {breakpoint === "phone" ? (
        <DateControl {...dateControl(day)} onOpen={() => dispatch({ type: "openPicker" })} />
      ) : (
        <WeekStrip
          heading={weekHeading(day, today)}
          label={weekLabel(week[0] ?? day)}
          days={weekPills(week, weekEvents ?? [], members, { tz, forecast, settings })}
          selected={day}
          today={today}
          breakpoint={breakpoint}
          previousLabel={copy.calendar.previousWeek}
          nextLabel={copy.calendar.nextWeek}
          onPrevious={() => dispatch({ type: "step", delta: -1, today })}
          onNext={() => dispatch({ type: "step", delta: 1, today })}
          onSelect={(chosen) => dispatch({ type: "select", day: chosen })}
        />
      )}
      <CalendarDay
        state={dayEvents.state}
        retryIn={dayEvents.retryIn}
        onRetry={dayEvents.retry}
        calendarEmpty={hasEvents === false}
        members={members}
        filter={filter}
        day={day}
        now={now}
        tz={tz}
        clock={settings.clock}
        breakpoint={breakpoint}
        span24={view.span24}
        weather={laneWeather(forecast, day, tz, settings.tempUnit, breakpoint)}
        onOpenEvent={(id) => sheets.open({ kind: "event", id })}
        onAddEvent={() => sheets.open(newEvent(day, filterMemberIds(filter, family)))}
        toolbar={
          <CalendarToolbar
            members={members}
            filter={filter}
            span24={view.span24}
            outside={outsideDay(shownTimed, tz)}
            phone={breakpoint === "phone"}
            onToggleMember={(id) => dispatch({ type: "toggleMember", id, family })}
            onEditFamily={() => sheets.open({ kind: "family" })}
            onToggleSpan={() => dispatch({ type: "toggleSpan" })}
            onAddEvent={() => sheets.open(newEvent(day, filterMemberIds(filter, family)))}
          />
        }
      />
      {breakpoint === "phone" && view.picker && (
        <PhoneDatePicker
          members={members}
          selected={day}
          today={today}
          tz={tz}
          onSelect={(chosen) => dispatch({ type: "select", day: chosen })}
          onClose={() => dispatch({ type: "closePicker" })}
        />
      )}
    </div>
  );
}

type PhoneDatePickerProps = {
  members: readonly Member[];
  selected: string;
  today: string;
  tz: string;
  onSelect: (day: string) => void;
  onClose: () => void;
};

function PhoneDatePicker({
  members,
  selected,
  today,
  tz,
  onSelect,
  onClose,
}: PhoneDatePickerProps) {
  const months = pickerMonths(today);

  const first = months[0]?.days[0] ?? today;

  const last = months.at(-1)?.days.at(-1) ?? today;

  const events = useEventsBetween(first, addDays(last, 1), tz);

  return (
    <DatePicker
      months={pickerViews(months, weekDots(events ?? [], members, tz))}
      selected={selected}
      today={today}
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

function newEvent(day: string, memberIds: string[] | undefined) {
  return { kind: "newevent" as const, day, ...(memberIds && { memberIds }) };
}

function weekLabel(sunday: string): string {
  const date = parseDateKey(sunday);

  return copy.calendar.week(formatMonth(date, "UTC"), date.getUTCDate());
}

function dateControl(day: string) {
  const date = parseDateKey(day);

  return {
    year: String(date.getUTCFullYear()),
    month: formatMonth(date, "UTC"),
    weekday: formatWeekday(date, "UTC"),
    date: date.getUTCDate(),
    name: formatLongDate(date, "UTC"),
  };
}

function pickerViews(
  months: readonly PickerMonth[],
  dots: ReadonlyMap<string, Dot[]>,
): PickerMonthView[] {
  return months.map((month) => ({
    ...month,
    days: month.days.map((key) => {
      const date = parseDateKey(key);

      return {
        key,
        weekday: formatWeekday(date, "UTC"),
        date: date.getUTCDate(),
        name: formatLongDate(date, "UTC"),
        dots: dots.get(key) ?? [],
      };
    }),
  }));
}

function weekPills(
  week: readonly string[],
  events: readonly CalendarEvent[],
  members: readonly Member[],
  { tz, forecast, settings }: PillContext,
): WeekDay[] {
  const dots = weekDots(events, members, tz);

  return week.map((key) => {
    const date = parseDateKey(key);

    const weekday = formatWeekday(date, "UTC");

    const daily = forecast?.daily.find((point) => point.date === key);

    return {
      key,
      weekday,
      date: date.getUTCDate(),
      name: formatLongDate(date, "UTC"),
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

function laneWeather(
  forecast: Weather | undefined,
  day: string,
  tz: string,
  unit: AccountSettings["tempUnit"],
  breakpoint: Breakpoint,
): TimelineWeather | undefined {
  if (!forecast || breakpoint === "phone") return undefined;

  return hourlyByHour(forecast.hourly, day, tz).size > 0
    ? { hourly: forecast.hourly, unit }
    : undefined;
}
