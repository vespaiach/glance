import type { ReactNode } from "react";
import { EventSheetScreen } from "@/features/events";
import { NoteSheetScreen } from "@/features/notes";
import { AppShell } from "@/shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <EventSheetScreen />
      <NoteSheetScreen />
    </>
  );
}
