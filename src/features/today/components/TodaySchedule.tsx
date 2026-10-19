import * as stylex from "@stylexjs/stylex";
import { ArrowRight, CalendarDays, CalendarX2, Plus } from "lucide-react";
import type { Ref } from "react";
import { copy } from "@/copy";
import { eventStatus } from "@/domain/eventStatus";
import type { CalendarEvent } from "@/domain/schemas";
import { type Clock, clockAt, minutesOfDay, timeParts } from "@/domain/time";
import { todaySchedule } from "@/domain/todaySchedule";
import type { ZoneState } from "@/domain/zoneState";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { AllDayTiles } from "@/ui/AllDayTile";
import { Button } from "@/ui/Button";
import { EventRow } from "@/ui/EventRow";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { press } from "@/ui/press";
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
  tz: string;
  compact: boolean;
  iconActions: boolean;
  rows: number;
  onOpenEvent: (id: string) => void;
  onAddEvent: () => void;
  onOpenCalendar: () => void;
  xstyle?: stylex.StyleXStyles;
  ref?: Ref<HTMLElement>;
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
  rows: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
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
  seeAll: {
    borderWidth: 0,
    font: "inherit",
    cursor: "pointer",
    textAlign: "start",
    flexShrink: 0,
    minHeight: 56,
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  seeAllLabel: {
    fontSize: 17,
    fontWeight: 480,
  },
  seeAllMeta: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: space.sm,
  },
  seeAllCount: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  empty: {
    flexGrow: 1,
    marginTop: space.xs,
    minHeight: 220,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
  },
});

const timeOf = (iso: string, clock: Clock, tz: string) =>
  timeParts(minutesOfDay(new Date(iso), tz), clock).time;

type ActionsProps = {
  canAdd: boolean;
  onAddEvent: () => void;
  onOpenCalendar: () => void;
};

type SeeAllProps = {
  count: number;
  hidden: { earlier: number; later: number };
  onClick: () => void;
};

type ScheduleRowsProps = Pick<
  TodayScheduleProps,
  "now" | "clock" | "tz" | "compact" | "rows" | "onOpenEvent" | "onOpenCalendar"
> & { events: readonly CalendarEvent[] };

export function TodaySchedule({
  state,
  retryIn,
  onRetry,
  now,
  clock,
  tz,
  compact,
  iconActions,
  rows,
  onOpenEvent,
  onAddEvent,
  onOpenCalendar,
  xstyle,
  ref,
}: TodayScheduleProps) {
  const Actions = iconActions ? IconActions : TextActions;

  return (
    <section ref={ref} {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{eyebrowFor(state, clock, tz)}</Eyebrow>
        <div {...stylex.props(styles.actions)}>
          <Actions
            canAdd={state.kind === "ready"}
            onAddEvent={onAddEvent}
            onOpenCalendar={onOpenCalendar}
          />
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
          <ScheduleRows
            events={events}
            now={now}
            clock={clock}
            tz={tz}
            compact={compact}
            rows={rows}
            onOpenEvent={onOpenEvent}
            onOpenCalendar={onOpenCalendar}
          />
        )}
      </Zone>
    </section>
  );
}

function TextActions({ canAdd, onAddEvent, onOpenCalendar }: ActionsProps) {
  return (
    <>
      {canAdd && (
        <Button variant="ghost" icon={Plus} onClick={onAddEvent}>
          {copy.today.schedule.addEvent}
        </Button>
      )}
      <Button variant="ghost" iconRight={ArrowRight} onClick={onOpenCalendar}>
        {copy.today.schedule.fullCalendar}
      </Button>
    </>
  );
}

function IconActions({ canAdd, onAddEvent, onOpenCalendar }: ActionsProps) {
  return (
    <>
      {canAdd && (
        <IconButton
          icon={Plus}
          label={copy.today.schedule.addEvent}
          variant="canvas"
          size="touch"
          onClick={onAddEvent}
        />
      )}
      <IconButton
        icon={CalendarDays}
        label={copy.today.schedule.fullCalendar}
        variant="canvas"
        size="touch"
        onClick={onOpenCalendar}
      />
    </>
  );
}

function eyebrowFor(state: ZoneState<CalendarEvent>, clock: Clock, tz: string): string {
  if (state.kind === "loading") return copy.today.schedule.loadingCount;

  if (state.kind === "failed") return copy.today.schedule.failedCount;

  if (state.kind === "empty") return copy.today.schedule.count(0);

  const count = copy.today.schedule.count(state.data.length);

  if (state.updatedAt === undefined) return count;

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

function SeeAll({ count, hidden, onClick }: SeeAllProps) {
  return (
    <button type="button" onClick={onClick} {...stylex.props(styles.seeAll, press.scale)}>
      <span {...stylex.props(styles.seeAllLabel)}>{copy.today.schedule.seeAll(count)}</span>
      <span {...stylex.props(styles.seeAllMeta)}>
        <span {...stylex.props(styles.seeAllCount)}>
          {copy.today.schedule.hidden(hidden.earlier, hidden.later)}
        </span>
        <Icon icon={ArrowRight} size={20} />
      </span>
    </button>
  );
}

function ScheduleRows({
  events,
  now,
  clock,
  tz,
  compact,
  rows,
  onOpenEvent,
  onOpenCalendar,
}: ScheduleRowsProps) {
  const { allDay, rows: shown, hidden } = todaySchedule(events, now, tz, rows);

  return (
    <>
      <AllDayTiles events={allDay} label={copy.events.allDay} onOpenEvent={onOpenEvent} />
      <div data-schedule-rows="" {...stylex.props(styles.rows)}>
        <div>
          {shown.map((event) => (
            <EventRow
              key={event.id}
              start={timeOf(event.startAt, clock, tz)}
              end={event.endAt && timeOf(event.endAt, clock, tz)}
              title={event.title}
              location={event.location}
              status={eventStatus(event, now, tz)}
              dot="soft"
              nowLabel={copy.events.now}
              compact={compact}
              onClick={() => onOpenEvent(event.id)}
            />
          ))}
        </div>
        {hidden.earlier + hidden.later > 0 && (
          <SeeAll count={events.length} hidden={hidden} onClick={onOpenCalendar} />
        )}
      </div>
    </>
  );
}
