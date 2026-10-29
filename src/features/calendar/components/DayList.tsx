import * as stylex from "@stylexjs/stylex";
import { ChevronDown, ChevronUp, CloudRain, FileText, Plus } from "lucide-react";
import { copy } from "@/copy";
import { type DayListGroups, type DayListRow, dayListGroups } from "@/domain/dayList";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { eventColor, whoLabel } from "@/domain/tags";
import { atMinute, type Clock, formatClock, formatDuration, rangeParts } from "@/domain/time";
import { planRain } from "@/domain/timeline";
import { hourlyByHour } from "@/domain/weather";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import type { TimelineFree, TimelineWeather } from "@/ui/DayTimeline";
import { Icon } from "@/ui/Icon";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";
import { tagFills } from "@/ui/tagFills";

type Slot = { start: Date; end: Date };

type DayListProps = {
  events: readonly CalendarEvent[];
  tags: readonly Tag[];
  day: string;
  now: Date;
  tz: string;
  clock: Clock;
  free: TimelineFree;
  weather?: TimelineWeather;
  earlierOpen: boolean;
  onToggleEarlier: () => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onAddEvent: (slot: Slot) => void;
};

type Group = {
  key: string;
  head?: string;
  rows: readonly DayListRow<CalendarEvent>[];
};

type Shared = Pick<
  DayListProps,
  "tags" | "day" | "tz" | "clock" | "free" | "onOpenEvent" | "onAddEvent"
> & {
  rain: ReadonlyMap<number, number>;
};

const OPEN_PLAN_LENGTH = 30;

const DOTS_MAX = 4;

const UNBOUNDED = Number.POSITIVE_INFINITY;

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    minWidth: 0,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  message: {
    margin: 0,
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  eyebrow: {
    paddingInline: 12,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    lineHeight: 1.2,
    textTransform: "uppercase",
  },
  toggle: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    paddingBlock: 0,
    paddingInlineStart: 14,
    paddingInlineEnd: 18,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 480,
    cursor: "pointer",
  },
  tile: {
    width: "100%",
    boxSizing: "border-box",
    borderWidth: 0,
    borderRadius: radii.md,
    font: "inherit",
    color: colors.textPrimary,
    textAlign: "start",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  allDay: {
    minHeight: 52,
    paddingBlock: 10,
    paddingInline: 14,
    display: "flex",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSoft,
  },
  allDayLabel: {
    flexShrink: 0,
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  allDayText: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  allDayTitle: {
    fontSize: 16,
    fontWeight: 540,
    letterSpacing: "-0.2px",
    lineHeight: 1.25,
    textWrap: "pretty",
  },
  allDayWhere: {
    fontSize: 14,
    fontWeight: 330,
  },
  plan: {
    paddingTop: 10,
    paddingInline: 12,
    paddingBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  soft: { backgroundColor: season.soft },
  past: {
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
  },
  now: { boxShadow: `inset 0 0 0 2px ${colors.black}` },
  timeLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minWidth: 0,
  },
  time: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.4px",
    lineHeight: "21px",
    fontVariantNumeric: "tabular-nums",
  },
  dots: {
    display: "flex",
    gap: 3,
    flexShrink: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: 540,
    letterSpacing: "-0.2px",
    lineHeight: "21px",
    textWrap: "pretty",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  pastTitle: {
    fontWeight: 340,
  },
  meta: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.3,
  },
  ellipsis: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  extra: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    paddingTop: 2,
  },
  rain: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.full,
    paddingBlock: 3,
    paddingInlineStart: 8,
    paddingInlineEnd: 10,
    backgroundColor: colors.surfaceCanvas,
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
  },
  note: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    fontSize: 15,
    fontWeight: 480,
    lineHeight: 1.3,
  },
  icon: {
    display: "flex",
    flexShrink: 0,
  },
  free: {
    minHeight: 44,
    paddingBlock: 0,
    paddingInline: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderHairline,
    backgroundColor: "transparent",
  },
  freeText: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: 8,
    minWidth: 0,
    paddingBlock: 8,
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    lineHeight: "18px",
    textTransform: "uppercase",
  },
  nowrap: {
    whiteSpace: "nowrap",
  },
});

export function DayList({
  events,
  tags,
  day,
  now,
  tz,
  clock,
  free,
  weather,
  earlierOpen,
  onToggleEarlier,
  onOpenEvent,
  onAddEvent,
}: DayListProps) {
  const allDay = events.filter((event) => event.allDay);

  const groups = dayListGroups(events, { day, now, tz }, free !== "none");

  const rain = weather ? rainByHour(weather, day, tz) : new Map<number, number>();

  const shared: Shared = { tags, day, tz, clock, free, rain, onOpenEvent, onAddEvent };

  const message = messageFor(free, events.length);

  const ended = groups.kind === "today" ? groups.earlier : [];

  return (
    <div {...stylex.props(styles.list)}>
      {message && <p {...stylex.props(styles.message)}>{message}</p>}
      {allDay.length > 0 && (
        <div {...stylex.props(styles.group)}>
          {allDay.map((event) => (
            <AllDayRow key={event.id} event={event} tags={tags} onOpen={onOpenEvent} />
          ))}
        </div>
      )}
      {ended.length > 0 && (
        <div {...stylex.props(styles.group)}>
          <button
            type="button"
            aria-expanded={earlierOpen}
            onClick={onToggleEarlier}
            {...stylex.props(styles.toggle, press.scale)}
          >
            <Icon icon={earlierOpen ? ChevronUp : ChevronDown} size={18} strokeWidth={2} />
            {earlierOpen ? copy.calendar.hideEarlier : copy.calendar.showEarlier(ended.length)}
          </button>
          {earlierOpen && <Rows rows={ended} shared={shared} />}
        </div>
      )}
      {groupsOf(groups).map((group) => (
        <div key={group.key} {...stylex.props(styles.group)}>
          {group.head && <span {...stylex.props(styles.eyebrow)}>{group.head}</span>}
          <Rows rows={group.rows} shared={shared} />
        </div>
      ))}
    </div>
  );
}

function messageFor(free: TimelineFree, count: number): string | undefined {
  if (free === "none") return copy.calendar.nobodySelected;

  return count === 0 ? copy.calendar.nothingScheduled : undefined;
}

function groupsOf(groups: DayListGroups<CalendarEvent>): Group[] {
  if (groups.kind === "day") {
    const head = groups.count > 0 ? copy.calendar.eventCount(groups.count) : undefined;

    return groups.rows.length > 0 ? [{ key: "day", head, rows: groups.rows }] : [];
  }

  return [
    { key: "now", head: copy.calendar.happeningNow, rows: groups.now },
    { key: "later", head: copy.calendar.laterToday(groups.laterCount), rows: groups.later },
  ].filter((group) => group.rows.length > 0);
}

function Rows({ rows, shared }: { rows: readonly DayListRow<CalendarEvent>[]; shared: Shared }) {
  return rows.map((row) =>
    row.kind === "plan" ? (
      <PlanRow key={row.plan.id} row={row} shared={shared} />
    ) : (
      <FreeRow key={`free-${row.start}`} row={row} shared={shared} />
    ),
  );
}

function AllDayRow({
  event,
  tags,
  onOpen,
}: {
  event: CalendarEvent;
  tags: readonly Tag[];
  onOpen: (event: CalendarEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      {...stylex.props(styles.tile, styles.allDay, press.scale)}
    >
      <span {...stylex.props(styles.allDayLabel)}>{copy.events.allDay}</span>
      <PersonDot color={eventColor(event, tags)} size="sm" />
      <span {...stylex.props(styles.allDayText)}>
        <span {...stylex.props(styles.allDayTitle)}>{event.title}</span>
        {event.location && (
          <span {...stylex.props(styles.allDayWhere, styles.ellipsis)}>{event.location}</span>
        )}
      </span>
    </button>
  );
}

function PlanRow({
  row,
  shared,
}: {
  row: Extract<DayListRow<CalendarEvent>, { kind: "plan" }>;
  shared: Shared;
}) {
  const { plan: event, status } = row;

  const past = status === "past";

  const time = rangeText(row.start, row.end, shared.clock);

  const chip = past
    ? 0
    : planRain(row.start, row.end ?? row.start + OPEN_PLAN_LENGTH, shared.rain, UNBOUNDED);

  const note = past ? "" : firstLine(event.notes);

  const meta = [whoLabel(event, shared.tags, copy.events.everyone), event.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      aria-label={copy.timeline.planName(event.title, time)}
      onClick={() => shared.onOpenEvent(event)}
      {...stylex.props(
        styles.tile,
        styles.plan,
        past ? styles.past : fillOf(event, shared.tags),
        status === "now" && styles.now,
        press.scale,
      )}
    >
      <span {...stylex.props(styles.timeLine)}>
        <span {...stylex.props(styles.time, styles.ellipsis)}>{time}</span>
        <PersonDots event={event} tags={shared.tags} />
      </span>
      <span {...stylex.props(styles.title, past && styles.pastTitle)}>{event.title}</span>
      {meta && <span {...stylex.props(styles.meta, styles.ellipsis)}>{meta}</span>}
      {(chip > 0 || note !== "") && (
        <span {...stylex.props(styles.extra)}>
          {chip > 0 && (
            <span {...stylex.props(styles.rain)}>
              <Icon icon={CloudRain} size={16} />
              {copy.timeline.rain(chip)}
            </span>
          )}
          {note !== "" && (
            <span {...stylex.props(styles.note)}>
              <span {...stylex.props(styles.icon)}>
                <Icon icon={FileText} size={16} />
              </span>
              <span {...stylex.props(styles.ellipsis)}>{note}</span>
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function FreeRow({
  row,
  shared,
}: {
  row: Extract<DayListRow<CalendarEvent>, { kind: "free" }>;
  shared: Shared;
}) {
  const { day, tz, clock } = shared;

  const label = copy.timeline.free(shared.free === "everyone", formatDuration(row.end - row.start));

  return (
    <button
      type="button"
      aria-label={copy.timeline.freeName(rangeText(row.start, row.end, clock))}
      onClick={() =>
        shared.onAddEvent({
          start: atMinute(day, row.newEvent.start, tz),
          end: atMinute(day, row.newEvent.end, tz),
        })
      }
      {...stylex.props(styles.tile, styles.free, press.scale)}
    >
      <span {...stylex.props(styles.freeText)}>
        <span {...stylex.props(styles.nowrap)}>{formatClock(row.start, clock)}</span>
        <span {...stylex.props(styles.nowrap)}>{label}</span>
      </span>
      <Icon icon={Plus} size={18} strokeWidth={2} />
    </button>
  );
}

function PersonDots({ event, tags }: { event: CalendarEvent; tags: readonly Tag[] }) {
  if (event.everyone || event.tagIds.length < 2) return null;

  const on = tags.filter((tag) => event.tagIds.includes(tag.id)).slice(0, DOTS_MAX);

  return (
    <span {...stylex.props(styles.dots)}>
      {on.map((tag) => (
        <PersonDot key={tag.id} color={tag.color} size="xsm" />
      ))}
    </span>
  );
}

function fillOf(event: CalendarEvent, tags: readonly Tag[]) {
  const color = eventColor(event, tags);

  return color === "soft" ? styles.soft : tagFills[color];
}

function rainByHour({ hourly }: TimelineWeather, day: string, tz: string): Map<number, number> {
  return new Map(
    [...hourlyByHour(hourly, day, tz)].map(([hour, point]) => [hour, point.precip ?? 0]),
  );
}

function rangeText(start: number, end: number | undefined, clock: Clock): string {
  if (end === undefined) return formatClock(start, clock);

  const { time, meridiem } = rangeParts(start, end, clock);

  return meridiem ? `${time} ${meridiem}` : time;
}

function firstLine(notes: string | undefined): string {
  return notes?.trim().split("\n")[0]?.trim() ?? "";
}
