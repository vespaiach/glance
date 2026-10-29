"use client";

import * as stylex from "@stylexjs/stylex";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRef, useState } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { eventStatus } from "@/domain/eventStatus";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { filterScope, matchesFilter, type TagFilter } from "@/domain/tags";
import { type Clock, clockAt } from "@/domain/time";
import { earlierFold, scheduleCount } from "@/domain/todaySchedule";
import type { ZoneState } from "@/domain/zoneState";
import { DayList } from "@/features/calendar";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { AllDayTiles } from "@/ui/AllDayTile";
import { Button } from "@/ui/Button";
import { DayTimeline, type DayTimelineLabels, type TimelineWeather } from "@/ui/DayTimeline";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { useBoxSize } from "@/ui/useBoxSize";
import { WhoFilter } from "@/ui/WhoFilter";
import { Zone } from "@/ui/Zone";
import { ComingUp } from "./ComingUp";

type Slot = { start: Date; end: Date };

type TodayScheduleProps = {
  state: ZoneState<CalendarEvent>;
  tags: readonly Tag[];
  selected: ReadonlySet<string>;
  onFilter: (filter: TagFilter) => void;
  retryIn: number;
  onRetry: () => void;
  day: string;
  now: Date;
  clock: Clock;
  tz: string;
  breakpoint: Breakpoint;
  iconActions: boolean;
  weather?: TimelineWeather;
  upcoming: readonly CalendarEvent[] | undefined;
  onOpenEvent: (event: CalendarEvent) => void;
  onAddEvent: () => void;
  onAddSlot: (slot: Slot) => void;
  onOpenCalendar: () => void;
  xstyle?: stylex.StyleXStyles;
};

type HeaderButtons = "text" | "touch" | "small";

type ActionsProps = {
  buttons: HeaderButtons;
  canAdd: boolean;
  onAddEvent: () => void;
  onOpenCalendar: () => void;
};

type ScheduleProps = Pick<
  TodayScheduleProps,
  | "tags"
  | "selected"
  | "day"
  | "now"
  | "clock"
  | "tz"
  | "breakpoint"
  | "weather"
  | "onOpenEvent"
  | "onAddSlot"
  | "onOpenCalendar"
> & {
  events: readonly CalendarEvent[];
  nowDot: boolean;
  showEarlier: boolean;
  onToggleEarlier: () => void;
};

const LABELS: DayTimelineLabels = {
  ...copy.timeline,
  everyone: copy.events.everyone,
  icons: copy.weather.icon,
};

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const NARROW_CARD = 450;

const TINY_CARD = 400;

const STACK_MAX = { wide: 5, narrow: 3 } as const;

const styles = stylex.create({
  root: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    paddingTop: space.sm,
    paddingInline: space.md,
    paddingBottom: space.md,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    minWidth: 0,
    minHeight: 0,
  },
  touchTop: {
    paddingTop: space.xs,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.xs,
    paddingBlock: space.xxs,
    paddingInlineStart: space.xs,
  },
  oneLine: {
    flexWrap: "nowrap",
  },
  actions: {
    display: "flex",
    gap: space.xxs,
  },
  smallButton: {
    width: 44,
    height: 44,
  },
  earlier: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    paddingBlock: 0,
    paddingInlineStart: 14,
    paddingInlineEnd: 18,
    marginInlineStart: space.xxs,
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    fontFamily: "inherit",
    fontSize: 16,
    fontWeight: 480,
    cursor: "pointer",
  },
  skeleton: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    paddingBlock: space.md,
    paddingInline: space.md,
  },
  failure: {
    paddingBlock: space.md,
    paddingInline: space.xs,
  },
  timeline: {
    minHeight: 200,
  },
});

export function TodaySchedule({
  state,
  retryIn,
  onRetry,
  iconActions,
  upcoming,
  onFilter,
  onAddEvent,
  xstyle,
  ...schedule
}: TodayScheduleProps) {
  const ref = useRef<HTMLElement>(null);

  const [showEarlier, setShowEarlier] = useState(false);

  const width = useBoxSize(ref)?.width ?? Number.POSITIVE_INFINITY;

  const narrow = width < NARROW_CARD;

  const buttons = headerButtons(narrow, iconActions);

  const shown = shownBy(schedule.selected, schedule.tags);

  const ahead = upcoming && shown(upcoming);

  const scheduleOf = (events: readonly CalendarEvent[]) => (
    <Schedule
      events={events}
      nowDot={width < TINY_CARD}
      showEarlier={showEarlier}
      onToggleEarlier={() => setShowEarlier((open) => !open)}
      {...schedule}
    />
  );

  const comingUp = ahead && ahead.length > 0 && (
    <ComingUp
      events={ahead}
      tags={schedule.tags}
      now={schedule.now}
      clock={schedule.clock}
      tz={schedule.tz}
      small={schedule.breakpoint === "small"}
      onOpenEvent={schedule.onOpenEvent}
    />
  );

  return (
    <section
      ref={ref}
      {...stylex.props(styles.root, buttons === "touch" && styles.touchTop, xstyle)}
    >
      <div {...stylex.props(styles.header, narrow && styles.oneLine)}>
        <Eyebrow>{eyebrowFor(state, shown, schedule, narrow)}</Eyebrow>
        <div {...stylex.props(styles.actions)}>
          <Actions
            buttons={buttons}
            canAdd={state.kind === "ready" || state.kind === "empty"}
            onAddEvent={onAddEvent}
            onOpenCalendar={schedule.onOpenCalendar}
          />
        </div>
      </div>
      {schedule.tags.length > 1 && (
        <WhoFilter
          tags={schedule.tags}
          selected={schedule.selected}
          size="today"
          max={narrow ? STACK_MAX.narrow : STACK_MAX.wide}
          labels={copy.personFilter}
          onChange={onFilter}
        />
      )}
      <Zone
        state={state}
        loading={<ScheduleSkeleton />}
        empty={comingUp || (ahead && scheduleOf([]))}
        failed={
          <SourceFailure
            icon={CalendarX2}
            title={copy.today.unavailable.calendar}
            body={copy.zone.failedBody(retryIn)}
            retryLabel={copy.zone.retry}
            onRetry={onRetry}
            xstyle={styles.failure}
          />
        }
      >
        {(events) => scheduleOf(shown(events))}
      </Zone>
    </section>
  );
}

function headerButtons(narrow: boolean, iconActions: boolean): HeaderButtons {
  if (narrow) return "small";

  return iconActions ? "touch" : "text";
}

function Actions({ buttons, canAdd, onAddEvent, onOpenCalendar }: ActionsProps) {
  if (buttons === "text") {
    return (
      <>
        {canAdd && (
          <Button variant="ghost" icon={CalendarPlus} onClick={onAddEvent}>
            {copy.today.schedule.addEvent}
          </Button>
        )}
        <Button variant="ghost" iconRight={ArrowRight} onClick={onOpenCalendar}>
          {copy.today.schedule.fullCalendar}
        </Button>
      </>
    );
  }

  const size = buttons === "touch" ? "touch" : "md";

  const xstyle = buttons === "small" ? styles.smallButton : undefined;

  return (
    <>
      {canAdd && (
        <IconButton
          icon={CalendarPlus}
          label={copy.today.schedule.addEvent}
          variant="canvas"
          size={size}
          onClick={onAddEvent}
          xstyle={xstyle}
        />
      )}
      <IconButton
        icon={CalendarDays}
        label={copy.today.schedule.fullCalendar}
        variant="canvas"
        size={size}
        onClick={onOpenCalendar}
        xstyle={xstyle}
      />
    </>
  );
}

function shownBy(selected: ReadonlySet<string>, tags: readonly Tag[]) {
  const allIds = tags.map((tag) => tag.id);

  return (events: readonly CalendarEvent[]) =>
    events.filter((event) => matchesFilter(event, selected, allIds));
}

function eyebrowFor(
  state: ZoneState<CalendarEvent>,
  shown: (events: readonly CalendarEvent[]) => readonly CalendarEvent[],
  { now, clock, tz }: Pick<TodayScheduleProps, "now" | "clock" | "tz">,
  short: boolean,
): string {
  if (state.kind === "loading") return copy.today.schedule.loadingCount;

  if (state.kind === "failed") return copy.today.schedule.failedCount;

  const events = state.kind === "ready" ? shown(state.data) : [];

  const count = copy.today.schedule.count(scheduleCount(events, now, tz), short);

  if (state.kind !== "ready" || state.updatedAt === undefined) return count;

  return copy.zone.updated(count, clockAt(state.updatedAt, clock, tz));
}

function ScheduleSkeleton() {
  return (
    <Skeleton label={copy.today.schedule.loading} xstyle={styles.skeleton}>
      {SKELETON_ROWS.map((row) => (
        <SkeletonBlock key={row} height={44} radius={radii.md} />
      ))}
    </Skeleton>
  );
}

function Schedule({
  events,
  tags,
  selected,
  day,
  now,
  clock,
  tz,
  breakpoint,
  weather,
  nowDot,
  showEarlier,
  onToggleEarlier,
  onOpenEvent,
  onAddSlot,
  onOpenCalendar,
}: ScheduleProps) {
  const free = filterScope(
    selected,
    tags.map((tag) => tag.id),
  );

  if (breakpoint === "small") {
    return (
      <DayList
        events={events}
        tags={tags}
        day={day}
        now={now}
        tz={tz}
        clock={clock}
        free={free}
        weather={weather}
        earlierOpen={showEarlier}
        onToggleEarlier={onToggleEarlier}
        onOpenEvent={onOpenEvent}
        onAddEvent={onAddSlot}
      />
    );
  }

  const timed = events.filter((event) => !event.allDay);

  const fold = earlierFold(timed, now, tz, showEarlier);

  const plans = !showEarlier
    ? timed.filter((event) => eventStatus(event, now, tz) !== "past")
    : timed;

  return (
    <>
      <AllDayTiles
        events={events.filter((event) => event.allDay)}
        tags={tags}
        label={copy.events.allDay}
        everyoneLabel={copy.events.everyone}
        onOpenEvent={onOpenEvent}
      />
      {fold.done > 0 && (
        <button
          type="button"
          aria-expanded={showEarlier}
          onClick={onToggleEarlier}
          {...stylex.props(styles.earlier, press.scale)}
        >
          <Icon icon={showEarlier ? ChevronUp : ChevronDown} size={18} strokeWidth={2} />
          {showEarlier ? copy.today.schedule.hideEarlier : copy.today.schedule.earlier(fold.done)}
        </button>
      )}
      <DayTimeline
        plans={plans}
        tags={tags}
        day={day}
        now={now}
        tz={tz}
        clock={clock}
        variant="today"
        breakpoint={breakpoint}
        free={free}
        weather={weather}
        firstHour={fold.fromHour}
        lastHour={fold.toHour}
        grow={breakpoint !== "large"}
        nowDot={nowDot}
        labels={LABELS}
        onOpenEvent={onOpenEvent}
        onOpenMore={onOpenCalendar}
        onAddEvent={onAddSlot}
        xstyle={styles.timeline}
      />
    </>
  );
}
