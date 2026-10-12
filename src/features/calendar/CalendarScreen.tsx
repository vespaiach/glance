"use client";

import * as stylex from "@stylexjs/stylex";
import { useEventsInMonth, useEventsOnDay, useHasEvents } from "@/data/repos";
import { markedDays, monthTitle } from "@/domain/month";
import type { CalendarEvent } from "@/domain/schemas";
import { formatDayTitle, localDateKey } from "@/domain/time";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { useBreakpoint, useViewportWidth } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useSheetHost } from "@/shell/SheetHost";
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

function dayState(
  events: readonly CalendarEvent[] | undefined,
  hasEvents: boolean | undefined,
): ZoneState<CalendarEvent> {
  return hasEvents === undefined ? { kind: "loading" } : readZoneState(events);
}

export function CalendarScreen() {
  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const width = useViewportWidth();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = localDateKey(now);

  const events = useEventsOnDay(day);

  const monthEvents = useEventsInMonth(year, month);

  const hasEvents = useHasEvents();

  return (
    <div {...stylex.props(styles.grid, calendarLayout(breakpoint))}>
      <MonthBlock
        title={monthTitle(year, month, now)}
        year={year}
        month={month}
        today={now.getDate()}
        selected={now.getDate()}
        marked={markedDays(monthEvents ?? [])}
        cell={calendarCell(breakpoint, width)}
      />
      <DayPanel
        state={dayState(events, hasEvents)}
        title={formatDayTitle(now)}
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
