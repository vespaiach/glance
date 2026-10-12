import * as stylex from "@stylexjs/stylex";
import { ArrowRight, CalendarDays, CalendarX2, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import { eventStatus } from "@/domain/eventStatus";
import type { CalendarEvent } from "@/domain/schemas";
import { type Clock, formatClock, minutesOfDay, timeParts } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { EventRow } from "@/ui/EventRow";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { Zone } from "@/ui/Zone";
import { tile } from "./tile";

type TodayScheduleProps = {
  state: ZoneState<CalendarEvent>;
  retryIn: number;
  onRetry: () => void;
  now: Date;
  clock: Clock;
  compact: boolean;
  onOpenEvent: (id: string) => void;
  onAddEvent: () => void;
  onOpenCalendar: () => void;
  children?: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

const SKELETON_ROWS = [0, 1, 2, 3, 4];

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
    gap: space.xs,
    minWidth: 0,
    minHeight: 0,
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
  actions: {
    display: "flex",
    gap: space.xxs,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    overflowY: "auto",
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
  empty: {
    flexGrow: 1,
    marginTop: space.xs,
    minHeight: 220,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
  },
});

const timeOf = (iso: string, clock: Clock) => timeParts(minutesOfDay(new Date(iso)), clock).time;

function eyebrowFor(state: ZoneState<CalendarEvent>, clock: Clock): string {
  if (state.kind === "loading") return copy.today.schedule.loadingCount;

  if (state.kind === "failed") return copy.today.schedule.failedCount;

  if (state.kind === "empty") return copy.today.schedule.count(0);

  const count = copy.today.schedule.count(state.data.length);

  if (state.updatedAt === undefined) return count;

  return copy.zone.updated(count, formatClock(minutesOfDay(new Date(state.updatedAt)), clock));
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

function EmptyDay({ onAddEvent }: { onAddEvent: () => void }) {
  return (
    <div {...stylex.props(tile.root, tile.start, styles.empty)}>
      <Icon icon={CalendarDays} size={32} strokeWidth={1.5} />
      <div {...stylex.props(tile.text)}>
        <span {...stylex.props(tile.title)}>{copy.today.schedule.emptyTitle}</span>
        <span {...stylex.props(tile.body)}>{copy.today.schedule.emptyBody}</span>
      </div>
      <Button icon={Plus} onClick={onAddEvent}>
        {copy.today.schedule.addEvent}
      </Button>
    </div>
  );
}

export function TodaySchedule({
  state,
  retryIn,
  onRetry,
  now,
  clock,
  compact,
  onOpenEvent,
  onAddEvent,
  onOpenCalendar,
  children,
  xstyle,
}: TodayScheduleProps) {
  return (
    <section {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{eyebrowFor(state, clock)}</Eyebrow>
        <div {...stylex.props(styles.actions)}>
          {state.kind === "ready" && (
            <Button variant="ghost" icon={Plus} onClick={onAddEvent}>
              {copy.today.schedule.addEvent}
            </Button>
          )}
          <Button variant="ghost" iconRight={ArrowRight} onClick={onOpenCalendar}>
            {copy.today.schedule.fullCalendar}
          </Button>
        </div>
      </div>
      <Zone
        state={state}
        loading={<ScheduleSkeleton />}
        empty={<EmptyDay onAddEvent={onAddEvent} />}
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
        {(events) => (
          <div {...stylex.props(styles.list)}>
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
        )}
      </Zone>
      {children}
    </section>
  );
}
