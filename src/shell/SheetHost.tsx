"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import type { FixtureParams } from "@/data/repos";
import type { EventTimes } from "@/domain/eventTimes";
import type { NoteTone } from "@/domain/schemas";

export type TimeFixture = NonNullable<FixtureParams["time"]>;

export type SheetRequest = (
  | { kind: "event"; id: string; time?: TimeFixture; edit?: true }
  | {
      kind: "newevent";
      day: string;
      memberIds?: readonly string[];
      times?: EventTimes;
      time?: TimeFixture;
    }
  | { kind: "note"; id: string; edit?: true }
  | { kind: "newnote"; draft?: { text: string; tone: NoteTone } }
  | { kind: "family"; removing?: string; name?: string; error?: true }
  | { kind: "photo"; id: string }
) & { discard?: true };

export type SheetHostValue = {
  sheet: SheetRequest | null;
  open(sheet: SheetRequest): void;
  close(): void;
};

const SheetHostContext = createContext<SheetHostValue | undefined>(undefined);

type SheetHostProps = {
  initial?: SheetRequest | null;
  children: ReactNode;
};

export function SheetHost({ initial = null, children }: SheetHostProps) {
  const pathname = usePathname();

  const [sheet, setSheet] = useState<SheetRequest | null>(initial);

  const [shownOn, setShownOn] = useState(pathname);

  if (pathname !== shownOn) {
    setShownOn(pathname);
    setSheet(null);
  }

  const host = useMemo(() => ({ sheet, open: setSheet, close: () => setSheet(null) }), [sheet]);

  return <SheetHostContext value={host}>{children}</SheetHostContext>;
}

export function useSheetHost(): SheetHostValue {
  const host = useContext(SheetHostContext);

  if (host === undefined) throw new Error("useSheetHost needs a SheetHost");

  return host;
}
