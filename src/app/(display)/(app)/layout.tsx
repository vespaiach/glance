import type { ReactNode } from "react";
import { EventSheetScreen } from "@/features/events";
import { FamilySheetScreen } from "@/features/family";
import { NoteSheetScreen } from "@/features/notes";
import { PhotoSheetScreen } from "@/features/photos";
import { AppShell } from "@/shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <EventSheetScreen />
      <NoteSheetScreen />
      <FamilySheetScreen />
      <PhotoSheetScreen />
    </>
  );
}
