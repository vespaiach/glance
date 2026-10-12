"use client";

import { type ShownNote, useNotes } from "@/data/repos";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useSheetHost } from "@/shell/SheetHost";
import { NoteBoard } from "./components/NoteBoard";

export function NotesScreen() {
  const sheets = useSheetHost();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const notes: ZoneState<ShownNote> = readZoneState(useNotes(now));

  return (
    <NoteBoard
      state={notes}
      expiry={settings.noteExpiry}
      now={now}
      clock={settings.clock}
      onOpenNote={(id) => sheets.open({ kind: "note", id })}
      onAddNote={() => sheets.open({ kind: "newnote" })}
    />
  );
}
