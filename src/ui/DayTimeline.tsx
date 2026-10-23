"use client";

import * as stylex from "@stylexjs/stylex";
import { CloudRain, FileText } from "lucide-react";
import { useRef } from "react";
import { type Breakpoint, type LayoutSize, layoutSize } from "@/domain/breakpoint";
import { type EventStatus, eventStatus } from "@/domain/eventStatus";
import type {
  AccountSettings,
  CalendarEvent,
  Tag,
  TagColor,
  Weather,
  WeatherIcon,
} from "@/domain/schemas";
import { eventColor, whoLabel } from "@/domain/tags";
import { displayTemp } from "@/domain/temperature";
import {
  atMinute,
  type Clock,
  formatClock,
  formatDuration,
  formatHour,
  rangeParts,
  timeParts,
} from "@/domain/time";
import {
  type FreeSlot,
  gutterWeather,
  laneTile,
  type PlacedPlan,
  type PlanCard,
  planCard,
  planRain,
  type TimelineLayout,
  timelineLayout,
} from "@/domain/timeline";
import { type HourlyPoint, hourlyByHour } from "@/domain/weather";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";
import { PersonDot } from "./PersonDot";
import { press } from "./press";
import { type BoxSize, useBoxSize } from "./useBoxSize";
import { weatherIcons } from "./weatherIcons";

export type DayTimelineLabels = {
  now: string;
  everyone: string;
  rain: (percent: number) => string;
  until: (time: string) => string;
  free: (everyone: boolean, length: string) => string;
  freeName: (range: string) => string;
  planName: (title: string, range: string) => string;
  lane: string;
  chance: (percent: number) => string;
  icons: Record<WeatherIcon, string>;
};

export type TimelineWeather = {
  hourly: Weather["hourly"];
  unit: AccountSettings["tempUnit"];
};

export type TimelineFree = "everyone" | "some" | "none";

type DayTimelineProps = {
  plans: readonly CalendarEvent[];
  tags: readonly Tag[];
  day: string;
  now: Date;
  tz: string;
  clock: Clock;
  variant: "calendar" | "today";
  breakpoint: Breakpoint;
  span?: "day" | "24h";
  free: TimelineFree;
  weather?: TimelineWeather;
  weatherAt?: "gutter" | "lane";
  labels: DayTimelineLabels;
  onOpenEvent: (id: string) => void;
  onAddEvent: (slot: { start: Date; end: Date }) => void;
  xstyle?: stylex.StyleXStyles;
};

type Dimensions = { gutter: number; titleSize: number };

type Fill = TagColor | "soft" | "past";

type Shared = {
  tags: readonly Tag[];
  now: Date;
  tz: string;
  clock: Clock;
  labels: DayTimelineLabels;
};

const FALLBACK_SIZE: BoxSize = { width: 640, height: 640 };

const INSET = 12;

const PASSED_FACTOR = { calendar: 0.35, today: 0.3 } as const;

const MIN_PLAN_HEIGHT: Record<LayoutSize, number> = { large: 44, small: 40 };

const DIMENSIONS: Record<"calendar" | "today", Record<LayoutSize, Dimensions>> = {
  calendar: {
    large: { gutter: 96, titleSize: 22 },
    small: { gutter: 52, titleSize: 16 },
  },
  today: {
    large: { gutter: 80, titleSize: 18 },
    small: { gutter: 52, titleSize: 16 },
  },
};

const LANE_WIDTH: Record<LayoutSize, number> = { large: 112, small: 48 };

const SLOT_INSET = 2;

const SLOT_GAP = 8;

const MIN_SLOT = 10;

const SLOT_LABEL = 28;

const styles = stylex.create({
  root: {
    position: "relative",
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    color: colors.textPrimary,
  },
  inner: (height: number) => ({
    position: "absolute",
    insetInline: 0,
    top: INSET,
    height,
  }),
  reflow: {
    transitionProperty: "top, height",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  },
  mark: (top: number) => ({
    position: "absolute",
    insetInline: 0,
    top,
    transform: "translateY(-10px)",
    display: "flex",
    alignItems: "flex-start",
    pointerEvents: "none",
  }),
  gutter: (width: number) => ({
    width,
    flexShrink: 0,
    boxSizing: "border-box",
    paddingInlineEnd: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  }),
  hidden: {
    visibility: "hidden",
  },
  hourLabel: {
    fontFamily: type.fontMono,
    fontSize: 14,
    lineHeight: "20px",
    letterSpacing: "0.54px",
    whiteSpace: "nowrap",
  },
  gutterWeather: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 15,
    fontWeight: 480,
    lineHeight: "18px",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  hairline: {
    flexGrow: 1,
    height: 1,
    marginTop: 10,
    backgroundColor: colors.borderHairline,
  },
  area: (left: number, right: number) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left,
    right,
  }),
  slot: (top: number, height: number) => ({
    position: "absolute",
    left: 0,
    right: SLOT_GAP,
    top,
    height,
  }),
  slotTile: {
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    paddingBlock: 0,
    paddingInline: 14,
    overflow: "hidden",
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderHairline,
    backgroundColor: "transparent",
  },
  slotLabel: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  plan: (top: number, height: number, left: string, width: string) => ({
    position: "absolute",
    top,
    height,
    left,
    width,
  }),
  planButton: {
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
    boxSizing: "border-box",
    paddingTop: 0,
    paddingInlineStart: 0,
    paddingInlineEnd: 8,
    paddingBottom: 4,
    borderWidth: 0,
    backgroundColor: "transparent",
    transitionProperty: "top, height, transform",
    transitionDuration: `${motion.durBase}, ${motion.durBase}, ${motion.durPress}`,
    transitionTimingFunction: motion.easeOut,
  },
  card: {
    height: "100%",
    boxSizing: "border-box",
    borderRadius: radii.md,
    paddingBlock: 8,
    paddingInline: 12,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: 4,
    overflow: "hidden",
  },
  oneLineCard: {
    paddingBlock: 0,
    justifyContent: "center",
  },
  soft: { backgroundColor: season.soft },
  past: {
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
  },
  now: { boxShadow: `inset 0 0 0 2px ${colors.black}` },
  lilac: { backgroundColor: colors.blockLilac },
  sky: { backgroundColor: colors.blockSky },
  coral: { backgroundColor: colors.blockCoral },
  mint: { backgroundColor: colors.blockMint },
  sun: { backgroundColor: colors.blockSun },
  pink: { backgroundColor: colors.blockPink },
  lime: { backgroundColor: colors.blockLime },
  rust: { backgroundColor: colors.blockRust },
  glacier: { backgroundColor: colors.blockGlacier },
  amber: { backgroundColor: colors.blockAmber },
  sage: { backgroundColor: colors.blockSage },
  ice: { backgroundColor: colors.blockIce },
  line: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    flexShrink: 0,
  },
  oneLine: {
    gap: 12,
  },
  firstLine: {
    gap: 8,
  },
  time: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  rangeTime: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  ellipsis: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  oneLineTitle: {
    flexGrow: 1,
    minWidth: 60,
    fontSize: 17,
    letterSpacing: "-0.2px",
  },
  title: (size: number) => ({
    fontSize: size,
    letterSpacing: "-0.3px",
    lineHeight: 1.2,
    flexShrink: 0,
  }),
  twoLines: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  titleWeight: {
    fontWeight: 540,
  },
  pastTitle: {
    fontWeight: 340,
    textDecoration: "line-through",
  },
  dots: {
    display: "flex",
    gap: 3,
    flexShrink: 0,
  },
  meta: {
    gap: 8,
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.3,
  },
  note: {
    gap: 8,
    fontSize: 15,
    fontWeight: 480,
    lineHeight: 1.3,
  },
  icon: {
    display: "flex",
    flexShrink: 0,
  },
  badge: {
    flexShrink: 0,
    borderRadius: radii.full,
    fontFamily: type.fontMono,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  nowBadge: {
    paddingBlock: 3,
    paddingInline: 12,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  rainBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingBlock: 3,
    paddingInlineStart: 8,
    paddingInlineEnd: 10,
    letterSpacing: "0.4px",
    backgroundColor: colors.surfaceCanvas,
  },
  lane: (width: number) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width,
    margin: 0,
    padding: 0,
    listStyle: "none",
  }),
  laneHour: (top: number, height: number) => ({
    position: "absolute",
    left: SLOT_GAP,
    right: 0,
    top,
    height,
    boxSizing: "border-box",
    paddingBlock: SLOT_INSET,
  }),
  laneTile: {
    height: "100%",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  laneWet: {
    backgroundColor: season.block3,
  },
  laneContent: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 15,
    fontWeight: 480,
    fontVariantNumeric: "tabular-nums",
  },
  laneStacked: {
    flexDirection: "column",
    gap: 2,
  },
  laneLarge: {
    fontSize: 18,
  },
  laneChance: {
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.4px",
  },
  nowMarker: (top: number) => ({
    position: "absolute",
    insetInline: 0,
    top,
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 2,
  }),
  nowGutter: (width: number) => ({
    width,
    flexShrink: 0,
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "flex-end",
    paddingInlineEnd: 8,
  }),
  nowPill: {
    borderRadius: radii.full,
    paddingBlock: 4,
    paddingInline: 10,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  nowLine: {
    flexGrow: 1,
    height: 2,
    backgroundColor: colors.black,
  },
});

export function DayTimeline({
  plans,
  tags,
  day,
  now,
  tz,
  clock,
  variant,
  breakpoint,
  span = "day",
  free,
  weather,
  weatherAt = "gutter",
  labels,
  onOpenEvent,
  onAddEvent,
  xstyle,
}: DayTimelineProps) {
  const ref = useRef<HTMLDivElement>(null);

  const size = useBoxSize(ref) ?? FALLBACK_SIZE;

  const record = layoutSize(breakpoint);

  const dimensions = DIMENSIONS[variant][record];

  const hours = weather ? hourlyByHour(weather.hourly, day, tz) : new Map<number, HourlyPoint>();

  const chips = variant === "calendar" && record === "large";

  const height = Math.max(0, size.height - 2 * INSET);

  const layout = timelineLayout(
    plans,
    { day, now, tz },
    {
      span,
      height,
      passedFactor: PASSED_FACTOR[variant],
      minPlanHeight: MIN_PLAN_HEIGHT[record],
    },
  );

  const shared: Shared = { tags, now, tz, clock, labels };

  const lane = weather && weatherAt === "lane" && hours.size > 0 ? LANE_WIDTH[record] : 0;

  const areaWidth = size.width - dimensions.gutter - lane;

  const rain = chips ? rainByHour(hours) : new Map<number, number>();

  return (
    <div ref={ref} {...stylex.props(styles.root, xstyle)}>
      <div {...stylex.props(styles.inner(height))}>
        <HourMarks
          layout={layout}
          gutter={dimensions.gutter}
          hours={hours}
          weather={lane > 0 ? undefined : weather}
          clock={clock}
          labels={labels}
        />
        <div {...stylex.props(styles.area(dimensions.gutter, lane))}>
          {free !== "none" &&
            layout.freeSlots.map((slot) => (
              <FreeSlotTile
                key={slot.start}
                slot={slot}
                everyone={free === "everyone"}
                clock={clock}
                labels={labels}
                onClick={() => onAddEvent(newEventAt(slot, day, tz))}
              />
            ))}
          {layout.plans.map((placed) => (
            <PlanTile
              key={placed.plan.id}
              placed={placed}
              shared={shared}
              width={(placed.columnSpan / placed.columns) * areaWidth}
              titleSize={dimensions.titleSize}
              rain={planRain(placed.start, placed.end, rain)}
              onClick={() => onOpenEvent(placed.plan.id)}
            />
          ))}
        </div>
        {lane > 0 && weather && (
          <WeatherLane
            width={lane}
            rows={layout.rows}
            hours={hours}
            unit={weather.unit}
            compact={record === "small"}
            labels={labels}
          />
        )}
        {layout.now && (
          <div {...stylex.props(styles.nowMarker(layout.now.top))}>
            <span {...stylex.props(styles.nowGutter(dimensions.gutter))}>
              <span {...stylex.props(styles.nowPill)}>
                {timeParts(layout.now.minutes, clock).time}
              </span>
            </span>
            <span {...stylex.props(styles.nowLine)} />
          </div>
        )}
      </div>
    </div>
  );
}

function HourMarks({
  layout,
  gutter,
  hours,
  weather,
  clock,
  labels,
}: {
  layout: TimelineLayout<CalendarEvent>;
  gutter: number;
  hours: ReadonlyMap<number, HourlyPoint>;
  weather: TimelineWeather | undefined;
  clock: Clock;
  labels: DayTimelineLabels;
}) {
  const nowTop = layout.now?.top ?? null;

  return layout.marks.map((mark) => {
    const row = layout.rows.find((item) => item.hour === mark.hour);
    const point = hours.get(mark.hour);
    const showWeather =
      weather !== undefined && point !== undefined && row !== undefined
        ? gutterWeather(mark, row.height, nowTop)
        : false;
    return (
      <div key={mark.hour} {...stylex.props(styles.mark(mark.top), styles.reflow)}>
        <div {...stylex.props(styles.gutter(gutter), !mark.label && styles.hidden)}>
          <span {...stylex.props(styles.hourLabel)}>
            {formatHour((mark.hour % 24) * 60, clock)}
          </span>
          {showWeather && point && weather && (
            <span {...stylex.props(styles.gutterWeather)}>
              <Icon
                icon={weatherIcons[point.icon]}
                size={16}
                strokeWidth={1.5}
                label={labels.icons[point.icon]}
              />
              {temperature(point.temp, weather.unit)}
            </span>
          )}
        </div>
        <span {...stylex.props(styles.hairline, !mark.line && styles.hidden)} />
      </div>
    );
  });
}

function WeatherLane({
  width,
  rows,
  hours,
  unit,
  compact,
  labels,
}: {
  width: number;
  rows: TimelineLayout<CalendarEvent>["rows"];
  hours: ReadonlyMap<number, HourlyPoint>;
  unit: TimelineWeather["unit"];
  compact: boolean;
  labels: DayTimelineLabels;
}) {
  return (
    <ul aria-label={labels.lane} {...stylex.props(styles.lane(width))}>
      {rows.map((row) => {
        const point = hours.get(row.hour);
        if (!point) return null;
        const tile = laneTile(row.height, compact, point.precip ?? 0);
        return (
          <li key={row.hour} {...stylex.props(styles.laneHour(row.top, row.height), styles.reflow)}>
            <div {...stylex.props(styles.laneTile, tile.wet && styles.laneWet)}>
              {tile.content && (
                <span
                  {...stylex.props(
                    styles.laneContent,
                    tile.stacked && styles.laneStacked,
                    tile.large && styles.laneLarge,
                  )}
                >
                  <Icon
                    icon={weatherIcons[point.icon]}
                    size={tile.large ? 26 : 18}
                    strokeWidth={1.5}
                    label={labels.icons[point.icon]}
                  />
                  {temperature(point.temp, unit)}
                  {tile.rain && (
                    <span {...stylex.props(styles.laneChance)}>
                      {labels.chance(point.precip ?? 0)}
                    </span>
                  )}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function FreeSlotTile({
  slot,
  everyone,
  clock,
  labels,
  onClick,
}: {
  slot: FreeSlot;
  everyone: boolean;
  clock: Clock;
  labels: DayTimelineLabels;
  onClick: () => void;
}) {
  const height = slot.height - SLOT_GAP;

  if (height <= MIN_SLOT) return null;

  return (
    <button
      type="button"
      aria-label={labels.freeName(rangeText(slot.start, slot.end, clock))}
      onClick={onClick}
      {...stylex.props(
        styles.slot(slot.top + SLOT_INSET, height),
        styles.slotTile,
        styles.reflow,
        press.scale,
      )}
    >
      {height >= SLOT_LABEL && (
        <span {...stylex.props(styles.slotLabel)}>
          {labels.free(everyone, formatDuration(slot.end - slot.start))}
        </span>
      )}
    </button>
  );
}

function PlanTile({
  placed,
  shared,
  width,
  titleSize,
  rain,
  onClick,
}: {
  placed: PlacedPlan<CalendarEvent>;
  shared: Shared;
  width: number;
  titleSize: number;
  rain: number;
  onClick: () => void;
}) {
  const { plan: event } = placed;

  const status = eventStatus(event, shared.now, shared.tz);

  const chip = status === "past" ? 0 : rain;

  const note = firstLine(event.notes);

  const card = planCard({
    width,
    height: placed.height,
    titleSize,
    badge: status === "now" || chip > 0,
    note: note !== "",
  });

  const end = event.endAt === undefined ? undefined : placed.end;

  const title = (
    <span
      {...stylex.props(
        card.oneLine ? [styles.ellipsis, styles.oneLineTitle] : styles.title(titleSize),
        !card.oneLine && (card.titleLines === 2 ? styles.twoLines : styles.ellipsis),
        status === "past" ? styles.pastTitle : styles.titleWeight,
      )}
    >
      {event.title}
    </span>
  );

  return (
    <button
      type="button"
      aria-label={shared.labels.planName(event.title, rangeText(placed.start, end, shared.clock))}
      onClick={onClick}
      {...stylex.props(
        styles.plan(
          placed.top,
          placed.height,
          percent(placed.column, placed.columns),
          percent(placed.columnSpan, placed.columns),
        ),
        styles.planButton,
        press.scale,
      )}
    >
      <span
        {...stylex.props(
          styles.card,
          card.oneLine && styles.oneLineCard,
          styles[fillOf(event, status, shared.tags)],
          status === "now" && styles.now,
        )}
      >
        {card.oneLine ? (
          <span {...stylex.props(styles.line, styles.oneLine)}>
            {card.time !== "none" && (
              <span {...stylex.props(styles.time)}>{timeText(placed, card, shared, end)}</span>
            )}
            {title}
            <PersonDots event={event} tags={shared.tags} />
          </span>
        ) : (
          <>
            <span {...stylex.props(styles.line, styles.firstLine)}>
              <span {...stylex.props(styles.time, styles.rangeTime)}>
                {timeText(placed, card, shared, end)}
              </span>
              {chip > 0 && (
                <span {...stylex.props(styles.badge, styles.rainBadge)}>
                  <Icon icon={CloudRain} size={16} />
                  {shared.labels.rain(chip)}
                </span>
              )}
              {status === "now" && (
                <span {...stylex.props(styles.badge, styles.nowBadge)}>{shared.labels.now}</span>
              )}
            </span>
            {title}
            {card.meta && (
              <span {...stylex.props(styles.line, styles.meta)}>
                <PersonDots event={event} tags={shared.tags} />
                <span {...stylex.props(styles.ellipsis)}>{metaText(event, shared)}</span>
              </span>
            )}
            {card.note && (
              <span {...stylex.props(styles.line, styles.note)}>
                <span {...stylex.props(styles.icon)}>
                  <Icon icon={FileText} size={18} />
                </span>
                <span {...stylex.props(styles.ellipsis)}>{note}</span>
              </span>
            )}
          </>
        )}
      </span>
    </button>
  );
}

function PersonDots({ event, tags }: { event: CalendarEvent; tags: readonly Tag[] }) {
  if (event.everyone || event.tagIds.length < 2) return null;

  const on = tags.filter((tag) => event.tagIds.includes(tag.id));

  return (
    <span {...stylex.props(styles.dots)}>
      {on.map((tag) => (
        <PersonDot key={tag.id} color={tag.color} size="sm" />
      ))}
    </span>
  );
}

function rainByHour(hours: ReadonlyMap<number, HourlyPoint>): Map<number, number> {
  return new Map([...hours].map(([hour, point]) => [hour, point.precip ?? 0]));
}

function newEventAt(slot: FreeSlot, day: string, tz: string) {
  return {
    start: atMinute(day, slot.newEvent.start, tz),
    end: atMinute(day, slot.newEvent.end, tz),
  };
}

function rangeText(start: number, end: number | undefined, clock: Clock): string {
  if (end === undefined) return formatClock(start, clock);

  const { time, meridiem } = rangeParts(start, end, clock);

  return meridiem ? `${time} ${meridiem}` : time;
}

function timeText(
  placed: PlacedPlan<CalendarEvent>,
  card: PlanCard,
  { clock, labels }: Shared,
  end: number | undefined,
): string {
  const format = (minutes: number) =>
    card.oneLine ? timeParts(minutes, clock).time : formatClock(minutes, clock);

  if (placed.startsBefore) return labels.until(format(placed.end));

  return card.time === "range" ? rangeText(placed.start, end, clock) : format(placed.start);
}

function metaText(event: CalendarEvent, { tags, labels }: Shared): string {
  const who = whoLabel(event, tags, labels.everyone);

  return [who, event.location].filter(Boolean).join(" · ");
}

function fillOf(event: CalendarEvent, status: EventStatus, tags: readonly Tag[]): Fill {
  return status === "past" ? "past" : eventColor(event, tags);
}

function firstLine(notes: string | undefined): string {
  return notes?.trim().split("\n")[0]?.trim() ?? "";
}

function percent(part: number, whole: number): string {
  return `${(part / whole) * 100}%`;
}

function temperature(fahrenheit: number, unit: TimelineWeather["unit"]): string {
  return `${displayTemp(fahrenheit, unit)}°`;
}
