import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { eventDayKey } from "@/domain/allDay";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { whoLabel } from "@/domain/tags";
import { type Clock, clockAt, formatMonthDay, formatWeekday } from "@/domain/time";
import { addDays, dateKey, parseDateKey } from "@/domain/zone";
import { colors, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";

type ComingUpProps = {
  events: readonly CalendarEvent[];
  tags: readonly Tag[];
  now: Date;
  clock: Clock;
  tz: string;
  small: boolean;
  onOpenEvent: (id: string) => void;
};

type RowProps = Omit<ComingUpProps, "events" | "small"> & { event: CalendarEvent };

const MAX_DOTS = 4;

const DAY_COLUMN = { small: 112, wide: 128 } as const;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    paddingTop: space.sm,
    paddingInline: space.xs,
    minWidth: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    paddingTop: space.xxs,
  },
  row: (column: number) => ({
    display: "grid",
    gridTemplateColumns: `${column}px minmax(0, 1fr)`,
    columnGap: space.sm,
    alignItems: "start",
    paddingBlock: 14,
    paddingInline: 0,
    boxSizing: "border-box",
    borderWidth: 0,
    backgroundColor: "transparent",
    font: "inherit",
    color: colors.textPrimary,
    textAlign: "start",
    cursor: "pointer",
    boxShadow: {
      default: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
      ":first-child": "none",
    },
  }),
  when: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontFamily: type.fontMono,
    letterSpacing: "0.4px",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  },
  day: {
    fontSize: 14,
    lineHeight: "21px",
  },
  time: {
    fontSize: 13,
    lineHeight: "18px",
  },
  what: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 540,
    letterSpacing: "-0.2px",
    lineHeight: 1.25,
    textWrap: "pretty",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    minWidth: 0,
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.3,
  },
  dots: {
    display: "flex",
    gap: 3,
    flexShrink: 0,
  },
  metaText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  nothing: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    paddingTop: space.xs,
  },
});

export function ComingUp({ events, small, ...row }: ComingUpProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <Eyebrow>{copy.today.schedule.comingUp}</Eyebrow>
      {events.length === 0 ? (
        <span {...stylex.props(styles.nothing)}>{copy.today.schedule.nothingAhead}</span>
      ) : (
        <div {...stylex.props(styles.list)}>
          {events.map((event) => (
            <ComingUpRow
              key={event.id}
              event={event}
              column={DAY_COLUMN[small ? "small" : "wide"]}
              {...row}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ComingUpRow({
  event,
  tags,
  now,
  clock,
  tz,
  column,
  onOpenEvent,
}: RowProps & { column: number }) {
  const day = dayLabel(event, now, tz);

  const time = event.allDay ? copy.today.schedule.allDay : clockAt(event.startAt, clock, tz);

  const who = whoLabel(event, tags, copy.events.everyone);

  const dots = dotsOf(event, tags);

  return (
    <button
      type="button"
      aria-label={copy.today.schedule.upcomingName(event.title, day, time, who)}
      onClick={() => onOpenEvent(event.id)}
      {...stylex.props(styles.row(column), press.row)}
    >
      <span {...stylex.props(styles.when)}>
        <span {...stylex.props(styles.day)}>{day}</span>
        <span {...stylex.props(styles.time)}>{time}</span>
      </span>
      <span {...stylex.props(styles.what)}>
        <span {...stylex.props(styles.title)}>{event.title}</span>
        <span {...stylex.props(styles.meta)}>
          {dots.length > 0 && (
            <span {...stylex.props(styles.dots)}>
              {dots.map((tag) => (
                <PersonDot key={tag.id} color={tag.color} />
              ))}
            </span>
          )}
          <span {...stylex.props(styles.metaText)}>
            {[who, event.location].filter(Boolean).join(" · ")}
          </span>
        </span>
      </span>
    </button>
  );
}

function dayLabel(event: CalendarEvent, now: Date, tz: string): string {
  const key = eventDayKey(event, tz);

  if (key === addDays(dateKey(now, tz), 1)) return copy.today.schedule.tomorrow;

  const date = parseDateKey(key);

  return copy.today.schedule.day(formatWeekday(date, "UTC"), formatMonthDay(date, "UTC"));
}

function dotsOf(event: CalendarEvent, tags: readonly Tag[]): Tag[] {
  if (event.everyone) return [];

  const on = tags.filter((tag) => event.tagIds.includes(tag.id));

  return on.length < tags.length ? on.slice(0, MAX_DOTS) : [];
}
