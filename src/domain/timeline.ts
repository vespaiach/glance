import type { CalendarEvent } from "./schemas";
import { minutesOfDay } from "./time";
import { dateKey } from "./zone";

export type TimelineOptions = {
  span: "day" | "24h";
  height: number;
  passedFactor: number;
  minPlanHeight: number;
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
  column: number;
  columns: number;
  columnSpan: number;
  startsBefore: boolean;
};

export type FreeSlot = {
  start: number;
  end: number;
  top: number;
  height: number;
  newEvent: { start: number; end: number };
};

export type TimelineLayout<T> = {
  rows: TimelineRow[];
  marks: HourMark[];
  plans: PlacedPlan<T>[];
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

type Box<T> = Omit<PlacedPlan<T>, "column" | "columns" | "columnSpan">;

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

const GUTTER_WEATHER = 46;

const GUTTER_NOW_CLEARANCE = 4;

export function timelineLayout<T extends TimelinePlan>(
  plans: readonly T[],
  { day, now, tz }: TimelineContext,
  options: TimelineOptions,
): TimelineLayout<T> {
  const intervals = plans.map((plan) => intervalOf(plan, tz));

  const [first, last] = options.span === "24h" ? [0, 24 * 60] : [DAY_START, DAY_END];

  const nowMinutes = dateKey(now, tz) === day ? minutesOfDay(now, tz) : null;

  const scale = scaleFor(intervals, { first, last, nowMinutes }, options);

  const nowMarker =
    nowMinutes !== null && nowMinutes >= first && nowMinutes < last
      ? { minutes: nowMinutes, top: scale.y(nowMinutes) }
      : null;

  return {
    rows: scale.rows,
    marks: hourMarks(scale, nowMarker?.top ?? null),
    plans: placePlans(intervals, scale, { first, last, minHeight: options.minPlanHeight }),
    freeSlots: freeSlots(intervals, nowMinutes).map((slot) => placeSlot(slot, scale)),
    now: nowMarker,
    hiddenOutsideSpan: intervals.filter((item) => item.start < first || item.end > last).length,
  };
}

export function outsideDay(plans: readonly TimelinePlan[], tz: string): number {
  return plans
    .map((plan) => intervalOf(plan, tz))
    .filter((item) => item.start < DAY_START || item.end > DAY_END).length;
}

export function planCard({ width, height, titleSize, badge, note }: PlanCardInput): PlanCard {
  const room = height - CARD_GAP;

  const titleLine = Math.ceil(titleSize * 1.2);

  const firstLines =
    CARD_PADDING + (badge ? BADGE_LINE : TIME_LINE) + CARD_LINE_GAP + titleLine + 2;

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
): number {
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

  const rows = stackRows(hours, weights, options.height / total);

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

function stackRows(hours: readonly number[], weights: readonly number[], unit: number) {
  const rows: TimelineRow[] = [];

  let top = 0;
  for (const [i, hour] of hours.entries()) {
    const weight = weights[i] ?? 0;
    rows.push({ hour, weight, top, height: weight * unit });
    top += weight * unit;
  }

  return rows;
}

function yAt(rows: readonly TimelineRow[], first: number, minutes: number): number {
  const index = Math.min(rows.length - 1, Math.max(0, Math.floor((minutes - first) / 60)));

  const row = rows[index];

  if (!row) return 0;

  return row.top + ((minutes - first - index * 60) / 60) * row.height;
}

function hourMarks(scale: Scale, nowTop: number | null): HourMark[] {
  const hours = [...scale.rows.map((row) => row.hour), (scale.rows.at(-1)?.hour ?? 0) + 1];

  let lastLabel = -Infinity;
  let lastLine = -Infinity;

  return hours.map((hour) => {
    const top = scale.y(hour * 60);
    const label =
      top - lastLabel >= LABEL_GAP && (nowTop === null || Math.abs(top - nowTop) >= NOW_LABEL_GAP);
    const line = label || top - lastLine >= LINE_GAP;
    if (label) lastLabel = top;
    if (line) lastLine = top;
    return { hour, top, label, line };
  });
}

function placePlans<T>(
  intervals: readonly Interval<T>[],
  scale: Scale,
  span: { first: number; last: number; minHeight: number },
): PlacedPlan<T>[] {
  const boxes = intervals
    .filter((item) => item.end > span.first && item.start < span.last)
    .map((item) => boxOf(item, scale, span))
    .sort((a, b) => a.top - b.top || b.height - a.height);

  return clusters(boxes).flatMap(assignColumns);
}

function boxOf<T>(
  { plan, start, end }: Interval<T>,
  scale: Scale,
  span: { first: number; last: number; minHeight: number },
): Box<T> {
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

function assignColumns<T>(cluster: Box<T>[]): PlacedPlan<T>[] {
  const order = [...cluster].sort((a, b) => longFirst(a, b) || a.top - b.top);

  const columnOf: Columns<T> = new Map();

  for (const box of order) columnOf.set(box, firstFreeColumn(box, columnOf));

  const columns = Math.max(...columnOf.values()) + 1;

  return cluster.map((box) => {
    const column = columnOf.get(box) ?? 0;
    return { ...box, column, columns, columnSpan: freeWidth(box, columnOf, columns) };
  });
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

function placeSlot([start, end]: readonly [number, number], scale: Scale): FreeSlot {
  const top = scale.y(start);

  const eventStart = Math.min(Math.ceil(start / SLOT_STEP) * SLOT_STEP, end - SLOT_STEP);

  return {
    start,
    end,
    top,
    height: scale.y(end) - top,
    newEvent: { start: eventStart, end: Math.min(eventStart + NEW_EVENT_LENGTH, end) },
  };
}
