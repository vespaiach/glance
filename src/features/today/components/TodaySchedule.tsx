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
import { type Clock, clockAt } from "@/domain/time";
import { earlierFold, scheduleCount } from "@/domain/todaySchedule";
import type { ZoneState } from "@/domain/zoneState";
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
import { Zone } from "@/ui/Zone";
import { ComingUp } from "./ComingUp";

type Slot = { start: Date; end: Date };

type TodayScheduleProps = {
  state: ZoneState<CalendarEvent>;
  tags: readonly Tag[];
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
  onOpenEvent: (id: string) => void;
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
  | "day"
  | "now"
  | "clock"
  | "tz"
  | "breakpoint"
  | "weather"
  | "onOpenEvent"
  | "onAddSlot"
  | "onOpenCalendar"
> & { events: readonly CalendarEvent[]; nowDot: boolean };

const LABELS: DayTimelineLabels = {
  ...copy.timeline,
  everyone: copy.events.everyone,
  icons: copy.weather.icon,
};

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const NARROW_CARD = 450;

const TINY_CARD = 400;

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
  onAddEvent,
  xstyle,
  ...schedule
}: TodayScheduleProps) {
  const ref = useRef<HTMLElement>(null);

  const width = useBoxSize(ref)?.width ?? Number.POSITIVE_INFINITY;

  const narrow = width < NARROW_CARD;

  const buttons = headerButtons(narrow, iconActions);

  const comingUp = upcoming && (
    <ComingUp
      events={upcoming}
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
        <Eyebrow>{eyebrowFor(state, schedule, narrow)}</Eyebrow>
        <div {...stylex.props(styles.actions)}>
          <Actions
            buttons={buttons}
            canAdd={state.kind === "ready" || state.kind === "empty"}
            onAddEvent={onAddEvent}
            onOpenCalendar={schedule.onOpenCalendar}
          />
        </div>
      </div>
      <Zone
        state={state}
        loading={<ScheduleSkeleton />}
        empty={comingUp}
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
        {(events) => <Schedule events={events} nowDot={width < TINY_CARD} {...schedule} />}
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

function eyebrowFor(
  state: ZoneState<CalendarEvent>,
  { now, clock, tz }: Pick<TodayScheduleProps, "now" | "clock" | "tz">,
  short: boolean,
): string {
  if (state.kind === "loading") return copy.today.schedule.loadingCount;

  if (state.kind === "failed") return copy.today.schedule.failedCount;

  const events = state.kind === "ready" ? state.data : [];

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
  day,
  now,
  clock,
  tz,
  breakpoint,
  weather,
  nowDot,
  onOpenEvent,
  onAddSlot,
  onOpenCalendar,
}: ScheduleProps) {
  const [showEarlier, setShowEarlier] = useState(false);

  const timed = events.filter((event) => !event.allDay);

  const fold = earlierFold(timed, now, tz);

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
          onClick={() => setShowEarlier((shown) => !shown)}
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
        free="everyone"
        weather={weather}
        firstHour={showEarlier ? undefined : fold.fromHour}
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
