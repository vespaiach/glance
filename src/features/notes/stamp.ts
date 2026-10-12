import { copy } from "@/copy";
import { type BoardNote, noteStamp } from "@/domain/notes";
import type { Clock } from "@/domain/time";

export function noteStampText(
  note: Pick<BoardNote, "createdAt" | "waiting">,
  now: Date,
  clock: Clock,
  tz: string,
): string {
  if (note.waiting) return copy.notes.waitingToPost;

  const stamp = noteStamp(note.createdAt, now, clock, tz);

  return stamp.kind === "justNow" ? copy.notes.justNow : stamp.text;
}
