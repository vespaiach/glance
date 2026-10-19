import * as stylex from "@stylexjs/stylex";
import { ArrowRight, CalendarDays, CalendarX2, Plus } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { CalendarEvent, Member } from "@/domain/schemas";
import { type Clock, clockAt } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { AllDayTiles } from "@/ui/AllDayTile";
import { Button } from "@/ui/Button";
import { DayTimeline, type DayTimelineLabels, type TimelineWeather } from "@/ui/DayTimeline";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { Zone } from "@/ui/Zone";
import { tile } from "./tile";

type Slot = { start: Date; end: Date };

type TodayScheduleProps = {
  state: ZoneState<CalendarEvent>;
  members: readonly Member[];
  retryIn: number;
  onRetry: () => void;
  day: string;
  now: Date;
  clock: Clock;
  tz: string;
  breakpoint: Breakpoint;
  oneColumn?: boolean;
  iconActions: boolean;
  weather?: TimelineWeather;
  onOpenEvent: (id: string) => void;
  onAddEvent: () => void;
  onAddSlot: (slot: Slot) => void;
  onOpenCalendar: () => void;
  xstyle?: stylex.StyleXStyles;
};

const LABELS: DayTimelineLabels = {
  ...copy.timeline,
  now: copy.events.now,
  everyone: copy.events.everyone,
  icons: copy.weather.icon,
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
  oneColumn: {
    minHeight: 560,
  },
  empty: {
    flexGrow: 1,
    marginTop: space.xs,
    minHeight: 220,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
  },
});

type ActionsProps = {
  canAdd: boolean;
  onAddEvent: () => void;
  onOpenCalendar: () => void;
};

type ScheduleProps = Pick<
  TodayScheduleProps,
  | "members"
  | "day"
  | "now"
  | "clock"
  | "tz"
  | "breakpoint"
  | "oneColumn"
  | "weather"
  | "onOpenEvent"
  | "onAddSlot"
> & { events: readonly CalendarEvent[] };

export function TodaySchedule({
  state,
  retryIn,
  onRetry,
  iconActions,
  onAddEvent,
  onOpenCalendar,
  xstyle,
  ...schedule
}: TodayScheduleProps) {
  const Actions = iconActions ? IconActions : TextActions;

  const { clock, tz } = schedule;

  return (
    <section {...stylex.props(styles.root, xstyle)}>
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
        {(events) => <Schedule events={events} {...schedule} />}
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

function Schedule({
  events,
  members,
  day,
  now,
  clock,
  tz,
  breakpoint,
  oneColumn = false,
  weather,
  onOpenEvent,
  onAddSlot,
}: ScheduleProps) {
  return (
    <>
      <AllDayTiles
        events={events.filter((event) => event.allDay)}
        members={members}
        label={copy.events.allDay}
        everyoneLabel={copy.events.everyone}
        onOpenEvent={onOpenEvent}
      />
      <DayTimeline
        plans={events.filter((event) => !event.allDay)}
        members={members}
        day={day}
        now={now}
        tz={tz}
        clock={clock}
        variant="today"
        breakpoint={breakpoint}
        free="everyone"
        weather={weather}
        labels={LABELS}
        onOpenEvent={onOpenEvent}
        onAddEvent={onAddSlot}
        xstyle={[styles.timeline, oneColumn && styles.oneColumn]}
      />
    </>
  );
}
