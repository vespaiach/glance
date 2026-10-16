import { eventStatus } from "./eventStatus";
import type { CalendarEvent } from "./schemas";

type HeroEvent = Pick<CalendarEvent, "startAt" | "endAt" | "allDay">;

export type TodayHero<T extends HeroEvent> =
  | { kind: "now"; event: T }
  | { kind: "next"; event: T }
  | { kind: "ended" }
  | { kind: "none" };

const byStart = (a: HeroEvent, b: HeroEvent) => a.startAt.localeCompare(b.startAt);

export function todayHero<T extends HeroEvent>(
  events: readonly T[],
  now: Date,
  tz: string,
): TodayHero<T> {
  const ordered = events.filter((event) => !event.allDay).sort(byStart);

  if (ordered.length === 0) return { kind: "none" };

  const running = ordered.filter((event) => eventStatus(event, now, tz) === "now").at(-1);

  if (running) return { kind: "now", event: running };

  const next = ordered.find((event) => eventStatus(event, now, tz) === "upcoming");

  return next ? { kind: "next", event: next } : { kind: "ended" };
}
