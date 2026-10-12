"use client";

import * as stylex from "@stylexjs/stylex";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useEventsInMonth, useEventsOnDay, useHasEvents } from "@/data/repos";
import { markedDays, monthTitle, readDateParam, stepMonth } from "@/domain/month";
import { formatDayTitle, localDateKey, parseLocalDate } from "@/domain/time";
import { useBreakpoint, useViewportWidth } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
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

function todayInMonth(now: Date, year: number, month: number): number | undefined {
  return now.getFullYear() === year && now.getMonth() === month ? now.getDate() : undefined;
}

function dayKey(year: number, month: number, day: number): string {
  return localDateKey(new Date(year, month, day));
}

export function CalendarScreen() {
  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const width = useViewportWidth();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const searchParams = useSearchParams();

  const [picked, setPicked] = useState(() => readDateParam(searchParams.get("date")));

  const day = picked ?? localDateKey(now);
  const selected = parseLocalDate(day);
  const year = selected.getFullYear();
  const month = selected.getMonth();

  const events = useEventsOnDay(day);

  const monthEvents = useEventsInMonth(year, month);

  const hasEvents = useHasEvents();

  const dayEvents = useSyncedZone(hasEvents === undefined ? undefined : events);

  return (
    <div {...stylex.props(styles.grid, calendarLayout(breakpoint))}>
      <MonthBlock
        title={monthTitle(year, month, now)}
        year={year}
        month={month}
        today={todayInMonth(now, year, month)}
        selected={selected.getDate()}
        marked={markedDays(monthEvents ?? [])}
        cell={calendarCell(breakpoint, width)}
        onPreviousMonth={() => setPicked(stepMonth(day, -1, now))}
        onNextMonth={() => setPicked(stepMonth(day, 1, now))}
        onSelectDay={(date) => setPicked(dayKey(year, month, date))}
      />
      <DayPanel
        state={dayEvents.state}
        retryIn={dayEvents.retryIn}
        onRetry={dayEvents.retry}
        title={formatDayTitle(selected)}
        calendarEmpty={hasEvents === false}
        now={now}
        clock={settings.clock}
        compact={breakpoint === "phone"}
        onOpenEvent={(id) => sheets.open({ kind: "event", id })}
        onAddEvent={() => sheets.open({ kind: "newevent", day })}
      />
    </div>
  );
}
