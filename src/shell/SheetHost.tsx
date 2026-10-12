"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type SheetRequest =
  | { kind: "event"; id: string }
  | { kind: "newevent"; day: string }
  | { kind: "note"; id: string }
  | { kind: "newnote" };

export type SheetHostValue = {
  sheet: SheetRequest | null;
  open(sheet: SheetRequest): void;
  close(): void;
};

const SheetHostContext = createContext<SheetHostValue | undefined>(undefined);

export function SheetHost({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [sheet, setSheet] = useState<SheetRequest | null>(null);

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
