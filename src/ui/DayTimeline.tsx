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
  grownHeight,
  hourWeather,
  type MoreTile,
  type PlacedPlan,
  type PlacedStrip,
  type PlanCard,
  planCard,
  planRain,
  type TimelineLayout,
  type TimelineOptions,
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
  everyone: string;
  rain: (percent: number) => string;
  until: (time: string) => string;
  free: (everyone: boolean, length: string) => string;
  freeName: (range: string) => string;
  planName: (title: string, range: string) => string;
  more: string;
  moreName: (count: number, range: string, opensCalendar: boolean) => string;
  longPlans: string;
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
  firstHour?: number;
  grow?: boolean;
  nowDot?: boolean;
  labels: DayTimelineLabels;
  onOpenEvent: (id: string) => void;
  onOpenMore: (earliestId: string) => void;
  onAddEvent: (slot: { start: Date; end: Date }) => void;
  xstyle?: stylex.StyleXStyles;
};

type TypeScale = {
  title: number;
  time: number;
  timeLine: number;
  detail: number;
  hour: number;
  oneLine: number;
};

type Variant = DayTimelineProps["variant"];

type Rules = Pick<TimelineOptions, "minColumn" | "minHourHeight" | "longStrips">;

type Fill = TagColor | "soft" | "past";

type Shared = {
  tags: readonly Tag[];
  now: Date;
  tz: string;
  clock: Clock;
  labels: DayTimelineLabels;
  scale: TypeScale;
};

const FALLBACK_SIZE: BoxSize = { width: 640, height: 640 };

const INSET = 12;

const PASSED_FACTOR = { calendar: 0.35, today: 0.3 } as const;

const MIN_PLAN_HEIGHT: Record<LayoutSize, number> = { large: 48, small: 40 };

const RULES: Record<Variant, Record<LayoutSize, Rules>> = {
  calendar: {
    large: { minColumn: 200, minHourHeight: 26, longStrips: true },
    small: { minColumn: 0, minHourHeight: 0, longStrips: false },
  },
  today: {
    large: { minColumn: 120, minHourHeight: 0, longStrips: true },
    small: { minColumn: 120, minHourHeight: 0, longStrips: true },
  },
};

const GUTTERS: Record<Variant, Record<LayoutSize, number>> = {
  calendar: { large: 96, small: 52 },
  today: { large: 80, small: 52 },
};

const BASE_TYPE: TypeScale = {
  title: 16,
  time: 14,
  timeLine: 18,
  detail: 15,
  hour: 14,
  oneLine: 17,
};

const TYPE: Record<Variant, Record<Breakpoint, TypeScale>> = {
  calendar: {
    large: { ...BASE_TYPE, title: 22 },
    normal: { ...BASE_TYPE, title: 22 },
    small: BASE_TYPE,
  },
  today: {
    large: { title: 20, time: 16, timeLine: 20, detail: 16, hour: 16, oneLine: 18 },
    normal: { ...BASE_TYPE, title: 18 },
    small: BASE_TYPE,
  },
};

const GROW_START = 536;

const SLOT_INSET = 2;

const SLOT_GAP = 8;

const STRIP_WIDTH = 44;

const SLOT_LABEL = 28;

const styles = stylex.create({
  fontSize: (size: number) => ({ fontSize: size }),
  grown: (height: number) => ({ minHeight: height }),
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
  todayWeather: {
    fontSize: 17,
    lineHeight: "22px",
  },
  hairline: {
    flexGrow: 1,
    height: 1,
    marginTop: 10,
    backgroundColor: colors.borderHairline,
  },
  area: (left: number) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left,
    right: 0,
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
  rainBadge: {
    flexShrink: 0,
    borderRadius: radii.full,
    fontFamily: type.fontMono,
    fontSize: 13,
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingBlock: 3,
    paddingInlineStart: 8,
    paddingInlineEnd: 10,
    letterSpacing: "0.4px",
    backgroundColor: colors.surfaceCanvas,
  },
  strip: (top: number, height: number, left: number) => ({
    position: "absolute",
    top,
    height,
    left,
    width: STRIP_WIDTH,
  }),
  strips: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    minWidth: 0,
  },
  stripButton: {
    paddingInlineEnd: 0,
  },
  stripCard: {
    paddingBlock: 12,
    paddingInline: 0,
    alignItems: "center",
  },
  stripText: {
    writingMode: "vertical-rl",
    display: "flex",
    alignItems: "center",
    gap: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    maxHeight: "100%",
  },
  stripTitle: {
    fontSize: 17,
    letterSpacing: "-0.2px",
  },
  moreCard: {
    backgroundColor: season.soft,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
    paddingBlock: 6,
    paddingInline: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  moreCount: {
    fontSize: 18,
    fontWeight: 540,
    lineHeight: 1.2,
    fontVariantNumeric: "tabular-nums",
  },
  moreWord: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  nowMarker: (top: number) => ({
    position: "absolute",
    insetInline: 0,
    top,
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
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
  nowDot: {
    width: 14,
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.black,
    marginInlineEnd: -7,
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
  firstHour,
  grow = false,
  nowDot = false,
  labels,
  onOpenEvent,
  onOpenMore,
  onAddEvent,
  xstyle,
}: DayTimelineProps) {
  const ref = useRef<HTMLDivElement>(null);

  const size = useBoxSize(ref) ?? FALLBACK_SIZE;

  const record = layoutSize(breakpoint);

  const gutter = GUTTERS[variant][record];

  const scale = TYPE[variant][breakpoint];

  const hours = weather ? hourlyByHour(weather.hourly, day, tz) : new Map<number, HourlyPoint>();

  const chips = variant === "calendar" && record === "large";

  const context = { day, now, tz };

  const options: TimelineOptions = {
    span,
    height: GROW_START,
    width: Math.max(0, size.width - gutter),
    passedFactor: PASSED_FACTOR[variant],
    minPlanHeight: MIN_PLAN_HEIGHT[record],
    firstHour,
    nowDot,
    ...RULES[variant][record],
  };

  const minHeight = grow ? grownHeight(plans, context, options) : 0;

  const height = Math.max(minHeight, size.height - 2 * INSET);

  const layout = timelineLayout(plans, context, { ...options, height });

  const shared: Shared = { tags, now, tz, clock, labels, scale };

  const columnsWidth = options.width - layout.stripsWidth;

  const rain = chips ? rainByHour(hours) : new Map<number, number>();

  return (
    <div
      ref={ref}
      {...stylex.props(styles.root, xstyle, grow && styles.grown(minHeight + 2 * INSET))}
    >
      <div {...stylex.props(styles.inner(height))}>
        <HourMarks
          layout={layout}
          gutter={gutter}
          hourSize={scale.hour}
          hours={hours}
          weather={weather}
          sparse={variant === "today"}
          clock={clock}
          labels={labels}
        />
        {layout.now && (
          <div {...stylex.props(styles.nowMarker(layout.now.top))}>
            <span {...stylex.props(styles.nowGutter(gutter))}>
              {nowDot ? (
                <span
                  role="img"
                  aria-label={timeParts(layout.now.minutes, clock).time}
                  {...stylex.props(styles.nowDot)}
                />
              ) : (
                <span {...stylex.props(styles.nowPill)}>
                  {timeParts(layout.now.minutes, clock).time}
                </span>
              )}
            </span>
            <span {...stylex.props(styles.nowLine)} />
          </div>
        )}
        {layout.strips.length > 0 && (
          <fieldset
            aria-label={labels.longPlans}
            {...stylex.props(styles.area(gutter), styles.strips)}
          >
            {layout.strips.map((strip) => (
              <StripTile
                key={strip.plan.id}
                strip={strip}
                shared={shared}
                onClick={() => onOpenEvent(strip.plan.id)}
              />
            ))}
          </fieldset>
        )}
        <div {...stylex.props(styles.area(gutter + layout.stripsWidth))}>
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
              width={placed.width * columnsWidth}
              rain={planRain(placed.start, placed.end, rain, placed.width * columnsWidth)}
              onClick={() => onOpenEvent(placed.plan.id)}
            />
          ))}
          {layout.more.map((tile) => (
            <MoreTileButton
              key={tile.first.id}
              tile={tile}
              opensCalendar={variant === "today"}
              clock={clock}
              labels={labels}
              onClick={() => onOpenMore(tile.first.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HourMarks({
  layout,
  gutter,
  hourSize,
  hours,
  weather,
  sparse,
  clock,
  labels,
}: {
  layout: TimelineLayout<CalendarEvent>;
  gutter: number;
  hourSize: number;
  hours: ReadonlyMap<number, HourlyPoint>;
  weather: TimelineWeather | undefined;
  sparse: boolean;
  clock: Clock;
  labels: DayTimelineLabels;
}) {
  const shown = weather ? hourWeather(layout, hours, sparse) : new Set<number>();

  return layout.marks.map((mark) => {
    const point = hours.get(mark.hour);
    const showWeather = shown.has(mark.hour);
    return (
      <div key={mark.hour} {...stylex.props(styles.mark(mark.top), styles.reflow)}>
        <div {...stylex.props(styles.gutter(gutter), !mark.label && styles.hidden)}>
          <span {...stylex.props(styles.hourLabel, styles.fontSize(hourSize))}>
            {formatHour((mark.hour % 24) * 60, clock)}
          </span>
          {showWeather && point && weather && (
            <span {...stylex.props(styles.gutterWeather, sparse && styles.todayWeather)}>
              <Icon
                icon={weatherIcons[point.icon]}
                size={sparse ? 20 : 16}
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
  rain,
  onClick,
}: {
  placed: PlacedPlan<CalendarEvent>;
  shared: Shared;
  width: number;
  rain: number;
  onClick: () => void;
}) {
  const { plan: event } = placed;

  const status = eventStatus(event, shared.now, shared.tz);

  const chip = status === "past" ? 0 : rain;

  const note = firstLine(event.notes);

  const { scale } = shared;

  const card = planCard({
    width,
    height: placed.height,
    titleSize: scale.title,
    timeLine: scale.timeLine,
    badge: chip > 0,
    note: note !== "",
  });

  const end = event.endAt === undefined ? undefined : placed.end;

  const title = (
    <span
      {...stylex.props(
        card.oneLine
          ? [styles.ellipsis, styles.oneLineTitle, styles.fontSize(scale.oneLine)]
          : styles.title(scale.title),
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
        styles.plan(placed.top, placed.height, percent(placed.left), percent(placed.width)),
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
              <span {...stylex.props(styles.time, styles.fontSize(scale.time))}>
                {timeText(placed, card, shared, end)}
              </span>
            )}
            {title}
            <PersonDots event={event} tags={shared.tags} />
          </span>
        ) : (
          <>
            <span {...stylex.props(styles.line, styles.firstLine)}>
              <span {...stylex.props(styles.time, styles.rangeTime, styles.fontSize(scale.time))}>
                {timeText(placed, card, shared, end)}
              </span>
              {chip > 0 && (
                <span {...stylex.props(styles.rainBadge)}>
                  <Icon icon={CloudRain} size={16} />
                  {shared.labels.rain(chip)}
                </span>
              )}
            </span>
            {title}
            {card.meta && (
              <span {...stylex.props(styles.line, styles.meta, styles.fontSize(scale.detail))}>
                <PersonDots event={event} tags={shared.tags} />
                <span {...stylex.props(styles.ellipsis)}>{metaText(event, shared)}</span>
              </span>
            )}
            {card.note && (
              <span {...stylex.props(styles.line, styles.note, styles.fontSize(scale.detail))}>
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

function StripTile({
  strip,
  shared,
  onClick,
}: {
  strip: PlacedStrip<CalendarEvent>;
  shared: Shared;
  onClick: () => void;
}) {
  const { plan: event } = strip;

  const status = eventStatus(event, shared.now, shared.tz);

  const end = event.endAt === undefined ? undefined : strip.end;

  return (
    <button
      type="button"
      aria-label={shared.labels.planName(event.title, rangeText(strip.start, end, shared.clock))}
      onClick={onClick}
      {...stylex.props(
        styles.strip(strip.top, strip.height, strip.left),
        styles.planButton,
        styles.stripButton,
        press.scale,
      )}
    >
      <span
        {...stylex.props(
          styles.card,
          styles.stripCard,
          styles[fillOf(event, status, shared.tags)],
          status === "now" && styles.now,
        )}
      >
        <span {...stylex.props(styles.stripText)}>
          <span
            {...stylex.props(
              styles.stripTitle,
              status === "past" ? styles.pastTitle : styles.titleWeight,
            )}
          >
            {event.title}
          </span>
          <span {...stylex.props(styles.time)}>
            {rangeText(strip.start, strip.end, shared.clock)}
          </span>
        </span>
      </span>
    </button>
  );
}

function MoreTileButton({
  tile,
  opensCalendar,
  clock,
  labels,
  onClick,
}: {
  tile: MoreTile<CalendarEvent>;
  opensCalendar: boolean;
  clock: Clock;
  labels: DayTimelineLabels;
  onClick: () => void;
}) {
  const name = labels.moreName(tile.count, rangeText(tile.start, tile.end, clock), opensCalendar);

  return (
    <button
      type="button"
      aria-label={name}
      onClick={onClick}
      {...stylex.props(
        styles.plan(tile.top, tile.height, percent(tile.left), percent(1 - tile.left)),
        styles.planButton,
        press.scale,
      )}
    >
      <span {...stylex.props(styles.card, styles.moreCard)}>
        <span {...stylex.props(styles.moreCount)}>{`+${tile.count}`}</span>
        {tile.tall && <span {...stylex.props(styles.moreWord)}>{labels.more}</span>}
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

function percent(share: number): string {
  return `${share * 100}%`;
}

function temperature(fahrenheit: number, unit: TimelineWeather["unit"]): string {
  return `${displayTemp(fahrenheit, unit)}°`;
}
