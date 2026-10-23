"use client";

import { type ShownNote, useNotes } from "@/data/repos";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone } from "@/shell/sourceZone";
import { NoteBoard } from "./components/NoteBoard";

export function NotesScreen() {
  const sheets = useSheetHost();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const notes = useSyncedZone<ShownNote>(useNotes(now));

  return (
    <NoteBoard
      state={notes.state}
      retryIn={notes.retryIn}
      onRetry={notes.retry}
      expiry={settings.noteExpiry}
      now={now}
      clock={settings.clock}
      tz={useTimeZone()}
      breakpoint={useBreakpoint()}
      onOpenNote={(id) => sheets.open({ kind: "note", id })}
      onAddNote={() => sheets.open({ kind: "newnote" })}
    />
  );
}
