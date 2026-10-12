import { copy } from "@/copy";
import { noteStamp } from "@/domain/notes";
import type { Note } from "@/domain/schemas";
import type { Clock } from "@/domain/time";

export function noteStampText(note: Pick<Note, "createdAt">, now: Date, clock: Clock): string {
  const stamp = noteStamp(note.createdAt, now, clock);

  return stamp.kind === "justNow" ? copy.notes.justNow : stamp.text;
}
