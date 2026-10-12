"use client";

import * as stylex from "@stylexjs/stylex";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useEventsInMonth, useEventsOnDay, useHasEvents } from "@/data/repos";
import { markedDays, monthTitle, readDateParam, stepMonth } from "@/domain/month";
import { formatDayTitle } from "@/domain/time";
import { dateKey, parseDateKey, wallTime } from "@/domain/zone";
import { useBreakpoint, useViewportWidth } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone } from "@/shell/sourceZone";
import { space } from "@/theme/tokens.stylex";
import { DayPanel } from "./components/DayPanel";
import { MonthBlock } from "./components/MonthBlock";
import { calendarCell, calendarLayout } from "./layout";

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
    alignItems: "start",
  },
});

function todayInMonth(today: string, year: number, month: number): number | undefined {
  const date = parseDateKey(today);

  const sameMonth = date.getUTCFullYear() === year && date.getUTCMonth() === month;

  return sameMonth ? date.getUTCDate() : undefined;
}

function dayKey(year: number, month: number, day: number): string {
  return dateKey(new Date(Date.UTC(year, month, day)), "UTC");
}

export function CalendarScreen() {
  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const width = useViewportWidth();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const searchParams = useSearchParams();

  const [picked, setPicked] = useState(() => readDateParam(searchParams.get("date")));

  const today = dateKey(now, tz);
  const day = picked ?? today;
  const selected = parseDateKey(day);
  const { year, month: monthNumber, day: date } = wallTime(selected, "UTC");
  const month = monthNumber - 1;

  const events = useEventsOnDay(day, tz);

  const monthEvents = useEventsInMonth(year, month, tz);

  const hasEvents = useHasEvents();

  const dayEvents = useSyncedZone(hasEvents === undefined ? undefined : events);

  return (
    <div {...stylex.props(styles.grid, calendarLayout(breakpoint))}>
      <MonthBlock
        title={monthTitle(year, month, now, tz)}
        year={year}
        month={month}
        today={todayInMonth(today, year, month)}
        selected={date}
        marked={markedDays(monthEvents ?? [], tz)}
        cell={calendarCell(breakpoint, width)}
        onPreviousMonth={() => setPicked(stepMonth(day, -1, now, tz))}
        onNextMonth={() => setPicked(stepMonth(day, 1, now, tz))}
        onSelectDay={(chosen) => setPicked(dayKey(year, month, chosen))}
      />
      <DayPanel
        state={dayEvents.state}
        retryIn={dayEvents.retryIn}
        onRetry={dayEvents.retry}
        title={formatDayTitle(selected, "UTC")}
        calendarEmpty={hasEvents === false}
        now={now}
        clock={settings.clock}
        tz={tz}
        compact={breakpoint === "phone"}
        onOpenEvent={(id) => sheets.open({ kind: "event", id })}
        onAddEvent={() => sheets.open({ kind: "newevent", day })}
      />
    </div>
  );
}
