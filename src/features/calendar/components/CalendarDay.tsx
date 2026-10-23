import * as stylex from "@stylexjs/stylex";
import { CalendarDays, CalendarX2 } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import { type Breakpoint, type LayoutSize, layoutSize } from "@/domain/breakpoint";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { filterTagIds, matchesFilter } from "@/domain/tags";
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
  onOpenEvent: (id: string) => void;
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
  now: copy.events.now,
  everyone: copy.events.everyone,
  icons: copy.weather.icon,
};

const SKELETON_ROWS = [0, 1, 2];

const TIMELINE_MIN: Record<LayoutSize, { day: number; full: number }> = {
  large: { day: 320, full: 760 },
  small: { day: 720, full: 1000 },
};

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
    paddingBlock: 12,
    paddingInlineStart: 8,
    paddingInlineEnd: 12,
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
  return (
    <section {...stylex.props(styles.panel, styles[layoutSize(timeline.breakpoint)])}>
      {toolbar}
      <Zone
        state={state}
        loading={<DaySkeleton />}
        empty={calendarEmpty ? <EmptyCalendar /> : <Timeline events={[]} {...timeline} />}
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
            <Timeline events={events} {...timeline} />
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

  const minHeight = TIMELINE_MIN[layoutSize(breakpoint)][span24 ? "full" : "day"];

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
        free={freeFor(filter, allIds)}
        weather={weather}
        labels={LABELS}
        onOpenEvent={onOpenEvent}
        onAddEvent={onAddEvent}
        xstyle={styles.timeline(minHeight)}
      />
      {spanLink}
    </>
  );
}

function freeFor(filter: ReadonlySet<string>, allIds: readonly string[]) {
  const who = filterTagIds(filter, allIds);

  if (who.everyone) return "everyone";

  return who.tagIds.length === 0 ? "none" : "some";
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

function EmptyCalendar() {
  return (
    <div {...stylex.props(styles.emptyTile)}>
      <Icon icon={CalendarDays} size={32} strokeWidth={1.5} />
      <div {...stylex.props(styles.emptyText)}>
        <span {...stylex.props(styles.emptyTitle)}>{copy.calendar.emptyTitle}</span>
        <span {...stylex.props(styles.emptyBody)}>{copy.calendar.emptyBody}</span>
      </div>
    </div>
  );
}
