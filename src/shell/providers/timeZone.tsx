"use client";

import { createContext, type ReactNode, useContext } from "react";
import { deviceTimeZone } from "@/domain/zone";

const TimeZoneContext = createContext<string | undefined>(undefined);

export function TimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone?: string;
  children: ReactNode;
}) {
  return <TimeZoneContext value={timeZone ?? deviceTimeZone()}>{children}</TimeZoneContext>;
}

export function useTimeZone(): string {
  return useContext(TimeZoneContext) ?? deviceTimeZone();
}
