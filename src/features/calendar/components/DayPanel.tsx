import * as stylex from "@stylexjs/stylex";
import { CalendarDays, CalendarX2, Plus } from "lucide-react";
import { copy } from "@/copy";
import { eventStatus } from "@/domain/eventStatus";
import type { CalendarEvent } from "@/domain/schemas";
import { type Clock, formatClock, minutesOfDay, timeParts } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { EventRow } from "@/ui/EventRow";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { Zone } from "@/ui/Zone";

type DayPanelProps = {
  state: ZoneState<CalendarEvent>;
  retryIn: number;
  onRetry: () => void;
  title: string;
  calendarEmpty: boolean;
  now: Date;
  clock: Clock;
  compact: boolean;
  onOpenEvent: (id: string) => void;
  onAddEvent: () => void;
  xstyle?: stylex.StyleXStyles;
};

const SKELETON_ROWS = [0, 1, 2];

const styles = stylex.create({
  root: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    paddingTop: space.xs,
    paddingInline: space.md,
    paddingBottom: space.md,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.md,
    minWidth: 0,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: space.md,
    paddingTop: space.xs,
    paddingInline: space.xs,
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: 340,
    letterSpacing: "-1px",
    lineHeight: 1,
  },
  freeDay: {
    margin: 0,
    paddingBlock: space.lg,
    paddingInline: space.xs,
    fontSize: 20,
    fontWeight: 340,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
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
    lineHeight: "normal",
  },
  skeleton: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    padding: space.md,
  },
});

const timeOf = (iso: string, clock: Clock) => timeParts(minutesOfDay(new Date(iso)), clock).time;

function eyebrowFor(state: ZoneState<CalendarEvent>, clock: Clock): string {
  if (state.kind === "loading") return copy.calendar.loadingCount;

  if (state.kind === "failed") return copy.calendar.failedCount;

  if (state.kind === "empty") return copy.calendar.count(0);

  const count = copy.calendar.count(state.data.length);

  if (state.updatedAt === undefined) return count;

  return copy.zone.updated(count, formatClock(minutesOfDay(new Date(state.updatedAt)), clock));
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

export function DayPanel({
  state,
  retryIn,
  onRetry,
  title,
  calendarEmpty,
  now,
  clock,
  compact,
  onOpenEvent,
  onAddEvent,
  xstyle,
}: DayPanelProps) {
  return (
    <section {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.heading)}>
          <Eyebrow>{eyebrowFor(state, clock)}</Eyebrow>
          <h2 {...stylex.props(styles.title)}>{title}</h2>
        </div>
        <Button icon={Plus} onClick={onAddEvent}>
          {copy.calendar.addEvent}
        </Button>
      </div>
      <Zone
        state={state}
        loading={<DaySkeleton />}
        empty={
          calendarEmpty ? (
            <EmptyCalendar />
          ) : (
            <p {...stylex.props(styles.freeDay)}>{copy.calendar.freeDay}</p>
          )
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
        {(events) => (
          <>
            <div>
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  start={timeOf(event.startAt, clock)}
                  end={event.endAt && timeOf(event.endAt, clock)}
                  title={event.title}
                  location={event.location}
                  status={eventStatus(event, now)}
                  dot={event.tone}
                  nowLabel={copy.events.now}
                  compact={compact}
                  onClick={() => onOpenEvent(event.id)}
                />
              ))}
            </div>
            <Eyebrow size="caption" xstyle={styles.caption}>
              {copy.calendar.caption}
            </Eyebrow>
          </>
        )}
      </Zone>
    </section>
  );
}
