"use client";

import * as stylex from "@stylexjs/stylex";
import { CalendarDays, CalendarX2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { copy } from "@/copy";
import { type Breakpoint, layoutSize } from "@/domain/breakpoint";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { filterScope, matchesFilter } from "@/domain/tags";
import { type Clock, clockAt } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { AllDayTiles } from "@/ui/AllDayTile";
import { DayTimeline, type DayTimelineLabels, type TimelineWeather } from "@/ui/DayTimeline";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { Zone } from "@/ui/Zone";
import { DayList } from "./DayList";

type CalendarDayProps = {
  state: ZoneState<CalendarEvent>;
  toolbar: ReactNode;
  spanLink: ReactNode;
  tags: readonly Tag[];
  filter: ReadonlySet<string>;
  calendarEmpty: boolean;
  day: string;
  now: Date;
  tz: string;
  clock: Clock;
  breakpoint: Breakpoint;
  span24: boolean;
  weather?: TimelineWeather;
  retryIn: number;
  onRetry: () => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onAddEvent: (slot: { start: Date; end: Date }) => void;
};

type TimelineProps = Omit<
  CalendarDayProps,
  "state" | "toolbar" | "calendarEmpty" | "retryIn" | "onRetry"
> & {
  events: readonly CalendarEvent[];
};

const LABELS: DayTimelineLabels = {
  ...copy.timeline,
  everyone: copy.events.everyone,
  icons: copy.weather.icon,
};

const SKELETON_ROWS = [0, 1, 2];

const TIMELINE_MIN = { day: 320, full: 760 } as const;

const styles = stylex.create({
  panel: {
    flexGrow: 1,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: space.md,
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  large: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingInlineStart: 20,
    paddingInlineEnd: 24,
  },
  small: {
    gap: space.lg,
    paddingTop: 12,
    paddingInline: 12,
    paddingBottom: 24,
  },
  timeline: (minHeight: number) => ({
    minHeight,
    transitionProperty: "min-height",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  }),
  emptyTile: {
    minHeight: 280,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: space.xl,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: space.md,
  },
  emptySmall: {
    minHeight: 0,
    backgroundColor: "transparent",
    paddingTop: space.xs,
    paddingBottom: 0,
    paddingInline: 0,
    gap: space.sm,
  },
  emptyText: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
  },
  emptyTitleSmall: {
    fontSize: 24,
    letterSpacing: "-0.3px",
  },
  emptyBody: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    maxWidth: 460,
    textWrap: "pretty",
  },
  caption: {
    paddingInline: space.xs,
  },
  skeleton: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    padding: space.md,
  },
});

export function CalendarDay({
  state,
  toolbar,
  calendarEmpty,
  retryIn,
  onRetry,
  ...timeline
}: CalendarDayProps) {
  const small = layoutSize(timeline.breakpoint) === "small";

  return (
    <section {...stylex.props(styles.panel, styles[layoutSize(timeline.breakpoint)])}>
      {toolbar}
      <Zone
        state={state}
        loading={<DaySkeleton />}
        empty={
          calendarEmpty ? <EmptyCalendar small={small} /> : <DayPlans events={[]} {...timeline} />
        }
        failed={
          <SourceFailure
            icon={CalendarX2}
            title={copy.calendar.unavailable}
            body={copy.zone.failedBody(retryIn)}
            retryLabel={copy.zone.retry}
            onRetry={onRetry}
          />
        }
      >
        {(events, updatedAt) => (
          <>
            <DayPlans events={events} {...timeline} />
            {updatedAt && (
              <Eyebrow size="caption" xstyle={styles.caption}>
                {copy.calendar.updated(clockAt(updatedAt, timeline.clock, timeline.tz))}
              </Eyebrow>
            )}
          </>
        )}
      </Zone>
    </section>
  );
}

function DayPlans(props: TimelineProps) {
  return layoutSize(props.breakpoint) === "small" ? (
    <SmallDay {...props} />
  ) : (
    <Timeline {...props} />
  );
}

function SmallDay({
  events,
  tags,
  filter,
  day,
  now,
  tz,
  clock,
  weather,
  onOpenEvent,
  onAddEvent,
}: TimelineProps) {
  const [earlierOpen, setEarlierOpen] = useState(false);

  const allIds = tags.map((tag) => tag.id);

  return (
    <DayList
      events={events.filter((event) => matchesFilter(event, filter, allIds))}
      tags={tags}
      day={day}
      now={now}
      tz={tz}
      clock={clock}
      free={filterScope(filter, allIds)}
      weather={weather}
      earlierOpen={earlierOpen}
      onToggleEarlier={() => setEarlierOpen((open) => !open)}
      onOpenEvent={onOpenEvent}
      onAddEvent={onAddEvent}
    />
  );
}

function Timeline({
  events,
  tags,
  filter,
  day,
  now,
  tz,
  clock,
  breakpoint,
  span24,
  weather,
  spanLink,
  onOpenEvent,
  onAddEvent,
}: TimelineProps) {
  const allIds = tags.map((tag) => tag.id);

  const shown = events.filter((event) => matchesFilter(event, filter, allIds));

  const minHeight = TIMELINE_MIN[span24 ? "full" : "day"];

  return (
    <>
      <AllDayTiles
        events={shown.filter((event) => event.allDay)}
        tags={tags}
        label={copy.events.allDay}
        everyoneLabel={copy.events.everyone}
        onOpenEvent={onOpenEvent}
      />
      <DayTimeline
        plans={shown.filter((event) => !event.allDay)}
        tags={tags}
        day={day}
        now={now}
        tz={tz}
        clock={clock}
        variant="calendar"
        breakpoint={breakpoint}
        span={span24 ? "24h" : "day"}
        free={filterScope(filter, allIds)}
        weather={weather}
        labels={LABELS}
        onOpenEvent={onOpenEvent}
        onOpenMore={onOpenEvent}
        onAddEvent={onAddEvent}
        xstyle={styles.timeline(minHeight)}
      />
      {spanLink}
    </>
  );
}

function DaySkeleton() {
  return (
    <Skeleton label={copy.calendar.loading} xstyle={styles.skeleton}>
      {SKELETON_ROWS.map((row) => (
        <SkeletonBlock key={row} height={44} radius={radii.md} />
      ))}
    </Skeleton>
  );
}

function EmptyCalendar({ small }: { small: boolean }) {
  return (
    <div {...stylex.props(styles.emptyTile, small && styles.emptySmall)}>
      <Icon icon={CalendarDays} size={small ? 28 : 32} strokeWidth={1.5} />
      <div {...stylex.props(styles.emptyText)}>
        <span {...stylex.props(styles.emptyTitle, small && styles.emptyTitleSmall)}>
          {copy.calendar.emptyTitle}
        </span>
        <span {...stylex.props(styles.emptyBody)}>{copy.calendar.emptyBody}</span>
      </div>
    </div>
  );
}
