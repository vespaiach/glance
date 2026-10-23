import { type EventStatus, eventStatus } from "./eventStatus";
import type { CalendarEvent } from "./schemas";
import { minutesOfDay } from "./time";
import { type FreeGap, freeGaps, type TimelineContext } from "./timeline";
import { dateKey } from "./zone";

export type DayListRow<T> =
  | { kind: "plan"; plan: T; start: number; end: number | undefined; status: EventStatus }
  | ({ kind: "free" } & FreeGap);

export type DayListGroups<T> =
  | {
      kind: "today";
      earlier: DayListRow<T>[];
      now: DayListRow<T>[];
      later: DayListRow<T>[];
      laterCount: number;
    }
  | { kind: "day"; rows: DayListRow<T>[]; count: number };

type DayPlan = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

type PlanRow<T> = Extract<DayListRow<T>, { kind: "plan" }>;

export function dayListGroups<T extends DayPlan>(
  events: readonly T[],
  context: TimelineContext,
  withFree: boolean,
): DayListGroups<T> {
  const timed = events.filter((event) => !event.allDay);

  const plans = timed.map((plan) => planRow(plan, context)).sort(byStart);

  const free = withFree ? freeGaps(timed, context).map((gap) => freeRow<T>(gap)) : [];

  if (context.day !== dateKey(context.now, context.tz)) {
    return { kind: "day", rows: inOrder(plans, free), count: plans.length };
  }

  const ahead = plans.filter((row) => row.status === "upcoming");

  return {
    kind: "today",
    earlier: plans.filter((row) => row.status === "past"),
    now: plans.filter((row) => row.status === "now"),
    later: inOrder(ahead, free),
    laterCount: ahead.length,
  };
}

function planRow<T extends DayPlan>(plan: T, { now, tz }: TimelineContext): PlanRow<T> {
  return {
    kind: "plan",
    plan,
    start: minutesOfDay(new Date(plan.startAt), tz),
    end: plan.endAt === undefined ? undefined : minutesOfDay(new Date(plan.endAt), tz),
    status: eventStatus(plan, now, tz),
  };
}

function freeRow<T>(gap: FreeGap): DayListRow<T> {
  return { kind: "free", ...gap };
}

function inOrder<T>(plans: readonly DayListRow<T>[], free: readonly DayListRow<T>[]) {
  return [...plans, ...free].sort(byStart);
}

function byStart<T>(a: DayListRow<T>, b: DayListRow<T>): number {
  return a.start - b.start || (a.end ?? a.start) - (b.end ?? b.start);
}
