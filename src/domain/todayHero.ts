import { eventStatus } from "./eventStatus";
import type { CalendarEvent } from "./schemas";

type HeroEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

export type TodayHero<T extends HeroEvent> =
  | { kind: "now"; event: T; left?: number }
  | { kind: "next"; event: T; in: number }
  | { kind: "ended"; done: number }
  | { kind: "none" };

export type EventHero<T extends HeroEvent> = Extract<TodayHero<T>, { event: T }>;

const MINUTE = 60_000;

const byStart = (a: HeroEvent, b: HeroEvent) => a.startAt.localeCompare(b.startAt);

export function todayHero<T extends HeroEvent>(
  events: readonly T[],
  now: Date,
  tz: string,
): TodayHero<T> {
  const ordered = events.filter((event) => !event.allDay).sort(byStart);

  if (ordered.length === 0) return { kind: "none" };

  const running = ordered.filter((event) => eventStatus(event, now, tz) === "now");

  if (running.length > 0) return runningHero(running, now);

  const next = ordered.find((event) => eventStatus(event, now, tz) === "upcoming");

  return next
    ? { kind: "next", event: next, in: minutesUntil(next.startAt, now) }
    : { kind: "ended", done: ordered.length };
}

export function hasEvent<T extends HeroEvent>(hero: TodayHero<T>): hero is EventHero<T> {
  return hero.kind === "now" || hero.kind === "next";
}

function runningHero<T extends HeroEvent>(running: readonly T[], now: Date): TodayHero<T> {
  const event = running.reduce(latestThenShortest);

  if (event.endAt === undefined) return { kind: "now", event };

  return { kind: "now", event, left: minutesUntil(event.endAt, now) };
}

function latestThenShortest<T extends HeroEvent>(shown: T, event: T): T {
  if (event.startAt !== shown.startAt) return event.startAt > shown.startAt ? event : shown;

  return endsSooner(event, shown) ? event : shown;
}

function endsSooner(a: HeroEvent, b: HeroEvent): boolean {
  if (a.endAt === undefined) return false;

  return b.endAt === undefined || a.endAt < b.endAt;
}

function minutesUntil(iso: string, now: Date): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / MINUTE);
}
