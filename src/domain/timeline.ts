import type { CalendarEvent } from "./schemas";
import { minutesOfDay } from "./time";
import { dateKey } from "./zone";

export type TimelineOptions = {
  span: "day" | "24h";
  height: number;
  width: number;
  passedFactor: number;
  minPlanHeight: number;
  minHourHeight: number;
  minColumn: number;
  longStrips: boolean;
  firstHour?: number;
  lastHour?: number;
  nowDot?: boolean;
};

export type TimelineContext = { day: string; now: Date; tz: string };

export type TimelineRow = { hour: number; weight: number; top: number; height: number };

export type HourMark = { hour: number; top: number; label: boolean; line: boolean };

export type PlacedPlan<T> = {
  plan: T;
  start: number;
  end: number;
  top: number;
  height: number;
  left: number;
  width: number;
  startsBefore: boolean;
};

export type PlacedStrip<T> = {
  plan: T;
  start: number;
  end: number;
  top: number;
  height: number;
  left: number;
};

export type MoreTile<T> = {
  first: T;
  count: number;
  start: number;
  end: number;
  top: number;
  height: number;
  left: number;
  tall: boolean;
};

export type HourSky = { icon: string; precip?: number };

export type FreeGap = {
  start: number;
  end: number;
  newEvent: { start: number; end: number };
};

export type FreeSlot = FreeGap & { top: number; height: number };

export type TimelineLayout<T> = {
  rows: TimelineRow[];
  marks: HourMark[];
  plans: PlacedPlan<T>[];
  strips: PlacedStrip<T>[];
  stripsWidth: number;
  more: MoreTile<T>[];
  freeSlots: FreeSlot[];
  now: { minutes: number; top: number } | null;
  hiddenOutsideSpan: number;
};

export type PlanCardInput = {
  width: number;
  height: number;
  titleSize: number;
  badge: boolean;
  note: boolean;
  timeLine?: number;
};

export type PlanCard = {
  oneLine: boolean;
  time: "range" | "start" | "none";
  titleLines: 1 | 2;
  meta: boolean;
  note: boolean;
};

type TimelinePlan = Pick<CalendarEvent, "startAt" | "endAt">;

type Interval<T> = { plan: T; start: number; end: number };

type Box<T> = Omit<PlacedPlan<T>, "left" | "width">;

type Span = { first: number; last: number; minHeight: number };

type Area = { width: number; minColumn: number };

type Placement<T> = { plans: PlacedPlan<T>[]; more: MoreTile<T>[] };

type Scale = { rows: TimelineRow[]; y: (minutes: number) => number };

type Columns<T> = Map<Box<T>, number>;

const DAY_START = 5 * 60;

const DAY_END = 21 * 60;

const SHORT_PLAN = 3 * 60;

const OPEN_PLAN_LENGTH = 30;

const MIN_FREE = 30;

const SLOT_STEP = 15;

const NEW_EVENT_LENGTH = 60;

const NIGHT_WEIGHT = 0.5;

const LABEL_GAP = 24;

const NOW_LABEL_GAP = 22;

const NOW_DOT_LABEL_GAP = 10;

const LINE_GAP = 12;

const OVERLAP_SLACK = 0.5;

const CARD_GAP = 4;

const CARD_PADDING = 16;

const TIME_LINE = 18;

const BADGE_LINE = 24;

const CARD_LINE_GAP = 4;

const DETAIL_LINE = 26;

const RANGE_WIDTH = 260;

const ONE_LINE_TIME_WIDTH = 200;

const RAIN_CHIP = 50;

const RAIN_CHIP_WIDTH = 180;

const SPARSE_WEATHER_HOURS = 3;

const STRIP_WIDTH = 44;

const STRIP_GAP = 8;

const MORE_WIDTH = 52;

const MORE_MIN_HEIGHT = 48;

const MORE_TALL = 60;

const FREE_TILE_GAP = 8;

const MIN_FREE_TILE = 44;

const GUTTER_WEATHER = 46;

const GUTTER_NOW_CLEARANCE = 4;

const FULL_CARD = 92;

const SHORT_CARD = 66;

const SHORT_CARD_UNDER = 30;

const MAX_GROWTH = 3;

export function timelineLayout<T extends TimelinePlan>(
  plans: readonly T[],
  { day, now, tz }: TimelineContext,
  options: TimelineOptions,
): TimelineLayout<T> {
  const intervals = plans.map((plan) => intervalOf(plan, tz));

  const [first, last] = spanOf(options);

  const nowMinutes = minutesToday(day, now, tz);

  const scale = scaleFor(intervals, { first, last, nowMinutes }, options);

  const nowMarker =
    nowMinutes !== null && nowMinutes >= first && nowMinutes < last
      ? { minutes: nowMinutes, top: scale.y(nowMinutes) }
      : null;

  const span = { first, last, minHeight: options.minPlanHeight };

  const long = options.longStrips ? intervals.filter(isLong) : [];

  const strips = placeStrips(long, scale, span);

  const stripsWidth = strips.length * (STRIP_WIDTH + STRIP_GAP);

  const area = { width: options.width - stripsWidth, minColumn: options.minColumn };

  const placement = placePlans(
    intervals.filter((item) => !long.includes(item)),
    scale,
    span,
    area,
  );

  return {
    rows: scale.rows,
    marks: hourMarks(scale, {
      top: nowMarker?.top ?? null,
      gap: options.nowDot ? NOW_DOT_LABEL_GAP : NOW_LABEL_GAP,
    }),
    plans: placement.plans,
    strips,
    stripsWidth,
    more: placement.more,
    freeSlots: freeSlots(intervals, nowMinutes)
      .map((slot) => placeSlot(slot, scale))
      .filter((slot) => slot.height - FREE_TILE_GAP >= MIN_FREE_TILE),
    now: nowMarker,
    hiddenOutsideSpan: intervals.filter((item) => item.start < first || item.end > last).length,
  };
}

export function grownHeight<T extends TimelinePlan>(
  plans: readonly T[],
  { day, now, tz }: TimelineContext,
  options: TimelineOptions,
): number {
  const intervals = plans.map((plan) => intervalOf(plan, tz));

  const [first, last] = spanOf(options);

  const nowMinutes = minutesToday(day, now, tz);

  const scale = scaleFor(intervals, { first, last, nowMinutes }, options);

  const factors = intervals
    .filter((item) => nowMinutes === null || item.end > nowMinutes)
    .map((item) => roomFactor(item, scale, [first, last]));

  return Math.round(options.height * Math.min(MAX_GROWTH, Math.max(1, ...factors)));
}

export function freeGaps(
  plans: readonly TimelinePlan[],
  { day, now, tz }: TimelineContext,
): FreeGap[] {
  const intervals = plans.map((plan) => intervalOf(plan, tz));

  return freeSlots(intervals, minutesToday(day, now, tz)).map(gapOf);
}

export function outsideDay(plans: readonly TimelinePlan[], tz: string): number {
  return plans
    .map((plan) => intervalOf(plan, tz))
    .filter((item) => item.start < DAY_START || item.end > DAY_END).length;
}

export function planCard({
  width,
  height,
  titleSize,
  badge,
  note,
  timeLine = TIME_LINE,
}: PlanCardInput): PlanCard {
  const room = height - CARD_GAP;

  const titleLine = Math.ceil(titleSize * 1.2);

  const firstLines = CARD_PADDING + (badge ? BADGE_LINE : timeLine) + CARD_LINE_GAP + titleLine + 2;

  if (room < firstLines) {
    return {
      oneLine: true,
      time: width >= ONE_LINE_TIME_WIDTH ? "start" : "none",
      titleLines: 1,
      meta: false,
      note: false,
    };
  }

  const titleLines = room >= firstLines + titleLine + CARD_LINE_GAP ? 2 : 1;

  const rest = room - firstLines - (titleLines - 1) * titleLine;

  const meta = rest >= DETAIL_LINE;

  return {
    oneLine: false,
    time: width >= RANGE_WIDTH ? "range" : "start",
    titleLines,
    meta,
    note: meta && note && rest >= 2 * DETAIL_LINE,
  };
}

export function planRain(
  start: number,
  end: number,
  rainByHour: ReadonlyMap<number, number>,
  width: number,
): number {
  if (width < RAIN_CHIP_WIDTH) return 0;

  let chance = 0;
  for (let hour = Math.floor(start / 60); hour * 60 < end; hour++) {
    chance = Math.max(chance, rainByHour.get(hour) ?? 0);
  }

  return chance >= RAIN_CHIP ? chance : 0;
}

export function gutterWeather(
  mark: Pick<HourMark, "label" | "top">,
  rowHeight: number,
  nowTop: number | null,
): boolean {
  if (!mark.label || rowHeight < GUTTER_WEATHER) return false;

  return (
    nowTop === null ||
    nowTop < mark.top + GUTTER_NOW_CLEARANCE ||
    nowTop > mark.top + GUTTER_WEATHER
  );
}

export function hourWeather(
  { marks, rows, now }: Pick<TimelineLayout<unknown>, "marks" | "rows" | "now">,
  sky: ReadonlyMap<number, HourSky>,
  sparse: boolean,
): Set<number> {
  const shown = new Set<number>();

  let last: { hour: number; icon: string; wet: boolean } | null = null;
  for (const mark of marks) {
    const point = sky.get(mark.hour);
    const row = rows.find((item) => item.hour === mark.hour);
    if (!point || !row || !gutterWeather(mark, row.height, now?.top ?? null)) continue;
    const wet = (point.precip ?? 0) >= RAIN_CHIP;
    const news =
      last === null ||
      point.icon !== last.icon ||
      wet !== last.wet ||
      mark.hour - last.hour >= SPARSE_WEATHER_HOURS;
    if (sparse && !news) continue;
    shown.add(mark.hour);
    last = { hour: mark.hour, icon: point.icon, wet };
  }

  return shown;
}

function spanOf({ span, firstHour = 0, lastHour }: TimelineOptions): [number, number] {
  if (span === "24h") return [0, 24 * 60];

  return [Math.max(DAY_START, firstHour * 60), lastHour === undefined ? DAY_END : lastHour * 60];
}

function minutesToday(day: string, now: Date, tz: string): number | null {
  return dateKey(now, tz) === day ? minutesOfDay(now, tz) : null;
}

function roomFactor<T>(item: Interval<T>, scale: Scale, [first, last]: [number, number]): number {
  const [from, to] = [Math.max(item.start, first), Math.min(item.end, last)];

  if (to <= from) return 1;

  const card = item.end - item.start >= SHORT_CARD_UNDER ? FULL_CARD : SHORT_CARD;

  return (card + CARD_GAP) / (scale.y(to) - scale.y(from));
}

function intervalOf<T extends TimelinePlan>(plan: T, tz: string): Interval<T> {
  const start = minutesOfDay(new Date(plan.startAt), tz);

  const end = plan.endAt === undefined ? start : minutesOfDay(new Date(plan.endAt), tz);

  return { plan, start, end: end > start ? end : start + OPEN_PLAN_LENGTH };
}

function scaleFor<T>(
  intervals: readonly Interval<T>[],
  span: { first: number; last: number; nowMinutes: number | null },
  options: TimelineOptions,
): Scale {
  const hours = Array.from(
    { length: (span.last - span.first) / 60 },
    (_, i) => span.first / 60 + i,
  );

  const weights = hours.map((hour) => hourWeight(hour, intervals, span.nowMinutes, options));

  const total = weights.reduce((sum, weight) => sum + weight, 0);

  const floor = Math.min(options.minHourHeight, options.height / hours.length);

  const rows = stackRows(hours, weights, {
    floor,
    unit: (options.height - floor * hours.length) / total,
  });

  return { rows, y: (minutes) => yAt(rows, span.first, minutes) };
}

function hourWeight<T>(
  hour: number,
  intervals: readonly Interval<T>[],
  nowMinutes: number | null,
  { passedFactor }: TimelineOptions,
): number {
  const [from, to] = [hour * 60, hour * 60 + 60];

  const elastic = 1 + 3 * coveredShare(intervals, from, to);

  const passed = nowMinutes !== null && to <= nowMinutes ? passedFactor : 1;

  const night = isNight(hour) && !intervals.some(overlaps(from, to)) ? NIGHT_WEIGHT : 1;

  return elastic * passed * night;
}

function coveredShare<T>(intervals: readonly Interval<T>[], from: number, to: number): number {
  const clipped = intervals
    .filter((item) => item.end - item.start <= SHORT_PLAN)
    .map((item) => [Math.max(item.start, from), Math.min(item.end, to)] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  let covered = 0;
  let reached = from;
  for (const [start, end] of clipped) {
    if (end <= reached) continue;
    covered += end - Math.max(start, reached);
    reached = end;
  }

  return covered / (to - from);
}

function isNight(hour: number): boolean {
  return hour < DAY_START / 60 || hour >= DAY_END / 60;
}

function overlaps(from: number, to: number) {
  return <T>(item: Interval<T>) => item.start < to && item.end > from;
}

function stackRows(
  hours: readonly number[],
  weights: readonly number[],
  { floor, unit }: { floor: number; unit: number },
) {
  const rows: TimelineRow[] = [];

  let top = 0;
  for (const [i, hour] of hours.entries()) {
    const weight = weights[i] ?? 0;
    const height = floor + weight * unit;
    rows.push({ hour, weight, top, height });
    top += height;
  }

  return rows;
}

function yAt(rows: readonly TimelineRow[], first: number, minutes: number): number {
  const index = Math.min(rows.length - 1, Math.max(0, Math.floor((minutes - first) / 60)));

  const row = rows[index];

  if (!row) return 0;

  return row.top + ((minutes - first - index * 60) / 60) * row.height;
}

function hourMarks(scale: Scale, now: { top: number | null; gap: number }): HourMark[] {
  const hours = [...scale.rows.map((row) => row.hour), (scale.rows.at(-1)?.hour ?? 0) + 1];

  let lastLabel = -Infinity;
  let lastLine = -Infinity;

  return hours.map((hour) => {
    const top = scale.y(hour * 60);
    const label =
      top - lastLabel >= LABEL_GAP && (now.top === null || Math.abs(top - now.top) >= now.gap);
    const line = label || top - lastLine >= LINE_GAP;
    if (label) lastLabel = top;
    if (line) lastLine = top;
    return { hour, top, label, line };
  });
}

function placePlans<T>(
  intervals: readonly Interval<T>[],
  scale: Scale,
  span: Span,
  area: Area,
): Placement<T> {
  const boxes = intervals
    .filter((item) => inSpan(item, span))
    .map((item) => boxOf(item, scale, span))
    .sort((a, b) => a.top - b.top || b.height - a.height);

  const placements = clusters(boxes).map((cluster) => placeCluster(cluster, area));

  return {
    plans: placements.flatMap((placement) => placement.plans),
    more: placements.flatMap((placement) => placement.more),
  };
}

function placeStrips<T>(long: readonly Interval<T>[], scale: Scale, span: Span): PlacedStrip<T>[] {
  return long
    .filter((item) => inSpan(item, span))
    .sort((a, b) => a.start - b.start)
    .map((item, i) => {
      const { startsBefore: _, ...box } = boxOf(item, scale, span);
      return { ...box, left: i * (STRIP_WIDTH + STRIP_GAP) };
    });
}

function inSpan<T>(item: Interval<T>, span: Span): boolean {
  return item.end > span.first && item.start < span.last;
}

function isLong<T>(item: Interval<T>): boolean {
  return item.end - item.start > SHORT_PLAN;
}

function boxOf<T>({ plan, start, end }: Interval<T>, scale: Scale, span: Span): Box<T> {
  const top = scale.y(Math.max(start, span.first));

  const bottom = Math.max(scale.y(Math.min(end, span.last)), top + span.minHeight);

  return { plan, start, end, top, height: bottom - top, startsBefore: start < span.first };
}

function clusters<T>(boxes: readonly Box<T>[]): Box<T>[][] {
  const groups: Box<T>[][] = [];

  let bottom = -Infinity;
  for (const box of boxes) {
    const current = groups.at(-1);
    if (current && box.top < bottom - OVERLAP_SLACK) {
      current.push(box);
      bottom = Math.max(bottom, bottomOf(box));
    } else {
      groups.push([box]);
      bottom = bottomOf(box);
    }
  }

  return groups;
}

function placeCluster<T>(cluster: Box<T>[], area: Area): Placement<T> {
  const columnOf = assignColumns(cluster);

  const columns = Math.max(...columnOf.values()) + 1;

  const fit = fittingColumns(columns, area);

  if (fit === null) {
    return {
      plans: cluster.map((box) => {
        const column = columnOf.get(box) ?? 0;
        return {
          ...box,
          left: column / columns,
          width: freeWidth(box, columnOf, columns) / columns,
        };
      }),
      more: [],
    };
  }

  return foldColumns(cluster, columnOf, {
    fit,
    columnWidth: (area.width - MORE_WIDTH) / area.width / fit,
  });
}

function assignColumns<T>(cluster: readonly Box<T>[]): Columns<T> {
  const order = [...cluster].sort((a, b) => longFirst(a, b) || a.top - b.top);

  const columnOf: Columns<T> = new Map();

  for (const box of order) columnOf.set(box, firstFreeColumn(box, columnOf));

  return columnOf;
}

function fittingColumns(columns: number, { width, minColumn }: Area): number | null {
  if (minColumn <= 0 || width <= 0) return null;

  if (columns <= Math.max(1, Math.floor(width / minColumn))) return null;

  return Math.max(1, Math.floor((width - MORE_WIDTH) / minColumn));
}

function foldColumns<T>(
  cluster: readonly Box<T>[],
  columnOf: Columns<T>,
  { fit, columnWidth }: { fit: number; columnWidth: number },
): Placement<T> {
  const folded = cluster.filter((box) => (columnOf.get(box) ?? 0) >= fit);

  const plans = cluster
    .filter((box) => !folded.includes(box))
    .map((box) => {
      const column = columnOf.get(box) ?? 0;
      const span = freeWidth(box, columnOf, fit);
      const left = column * columnWidth;
      const toEdge = column + span === fit && !folded.some((other) => collide(other, box));
      return { ...box, left, width: toEdge ? 1 - left : span * columnWidth };
    });

  return { plans, more: foldedGroups(folded).map((group) => moreTile(group, fit * columnWidth)) };
}

function foldedGroups<T>(folded: readonly Box<T>[]): Box<T>[][] {
  return clusters([...folded].sort((a, b) => a.top - b.top));
}

function moreTile<T>(group: readonly Box<T>[], left: number): MoreTile<T> {
  const [first] = [...group].sort((a, b) => a.start - b.start);

  const top = Math.min(...group.map((box) => box.top));

  const reach = Math.max(...group.map(bottomOf)) - top;

  return {
    first: (first ?? group[0])?.plan as T,
    count: group.length,
    start: Math.min(...group.map((box) => box.start)),
    end: Math.max(...group.map((box) => box.end)),
    top,
    height: Math.max(reach, MORE_MIN_HEIGHT),
    left,
    tall: reach >= MORE_TALL,
  };
}

function firstFreeColumn<T>(box: Box<T>, columnOf: Columns<T>): number {
  let column = 0;
  while (busyColumn(box, columnOf, column)) column++;

  return column;
}

function freeWidth<T>(box: Box<T>, columnOf: Columns<T>, columns: number): number {
  const column = columnOf.get(box) ?? 0;

  let span = 1;
  while (column + span < columns && !busyColumn(box, columnOf, column + span)) span++;

  return span;
}

function busyColumn<T>(box: Box<T>, columnOf: Columns<T>, column: number): boolean {
  return [...columnOf].some(([other, at]) => at === column && collide(other, box));
}

function longFirst<T>(a: Box<T>, b: Box<T>): number {
  return Number(b.end - b.start > SHORT_PLAN) - Number(a.end - a.start > SHORT_PLAN);
}

function collide<T>(a: Box<T>, b: Box<T>): boolean {
  return a.top < bottomOf(b) - OVERLAP_SLACK && bottomOf(a) > b.top + OVERLAP_SLACK;
}

function bottomOf<T>(box: Box<T>): number {
  return box.top + box.height;
}

function freeSlots<T>(intervals: readonly Interval<T>[], nowMinutes: number | null) {
  const busy = intervals
    .map((item) => [Math.max(item.start, DAY_START), Math.min(item.end, DAY_END)] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  const gaps: [number, number][] = [];
  let reached = DAY_START;
  for (const [start, end] of [...busy, [DAY_END, DAY_END] as const]) {
    if (start - reached >= MIN_FREE) gaps.push([reached, start]);
    reached = Math.max(reached, end);
  }

  return gaps
    .map(([start, end]) => [Math.max(start, nowMinutes ?? start), end] as const)
    .filter(([start, end]) => end - start >= MIN_FREE);
}

function placeSlot(slot: readonly [number, number], scale: Scale): FreeSlot {
  const gap = gapOf(slot);

  const top = scale.y(gap.start);

  return { ...gap, top, height: scale.y(gap.end) - top };
}

function gapOf([start, end]: readonly [number, number]): FreeGap {
  const eventStart = Math.min(Math.ceil(start / SLOT_STEP) * SLOT_STEP, end - SLOT_STEP);

  return {
    start,
    end,
    newEvent: { start: eventStart, end: Math.min(eventStart + NEW_EVENT_LENGTH, end) },
  };
}
