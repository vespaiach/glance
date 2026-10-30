import { eventDayKey } from "@/domain/allDay";
import type {
  ReviewEvent,
  LastImport as ServerLast,
  ImportReview as ServerReview,
} from "@/domain/imports";
import { type Clock, clockAt, formatMonthDay, formatWeekday } from "@/domain/time";
import { dayStart } from "@/domain/zone";
import type { LastImport } from "./components/SourceStep";
import type { ImportRange, ImportReview, ImportRow } from "./importPage";

export function reviewShown(review: ServerReview, tz: string, clock: Clock): ImportReview {
  const { fileName, size, newCount, duplicates, matched } = review;

  const rows = review.events.map((event, index) => rowShown(event, String(index), tz, clock));

  return {
    fileName,
    size,
    range: rangeShown(review.range, tz),
    rows,
    newCount,
    duplicates,
    matched,
  };
}

export function rangeShown(range: ServerReview["range"], tz: string): ImportRange {
  return { from: monthDay(range.first, tz), to: monthDay(range.last, tz) };
}

export function lastShown(last: ServerLast, now: Date, tz: string): LastImport {
  return {
    date: formatMonthDay(new Date(last.importedAt), tz),
    count: last.count,
    who: last.who,
    canUndo: now < new Date(last.undoUntil),
  };
}

function rowShown(event: ReviewEvent, id: string, tz: string, clock: Clock): ImportRow {
  const day = dayStart(eventDayKey(event, tz), tz);

  return {
    id,
    date: `${formatWeekday(day, tz)}, ${formatMonthDay(day, tz)}`,
    title: event.title,
    ...(!event.allDay && { time: clockAt(event.startAt, clock, tz) }),
    ...(event.repeat === "weekly" && { weekly: true }),
    duplicate: event.duplicate,
  };
}

function monthDay(key: string, tz: string): string {
  return formatMonthDay(dayStart(key, tz), tz);
}
