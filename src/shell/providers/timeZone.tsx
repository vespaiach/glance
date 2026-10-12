"use client";

import { createContext, type ReactNode, useContext } from "react";
import { deviceTimeZone, displayTimeZone } from "@/domain/zone";
import { useAccountSettings } from "./settings";

const TimeZoneContext = createContext<string | undefined>(undefined);

export function TimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone?: string;
  children: ReactNode;
}) {
  const settings = useAccountSettings();

  return (
    <TimeZoneContext value={timeZone ?? displayTimeZone(settings, deviceTimeZone())}>
      {children}
    </TimeZoneContext>
  );
}

export function useTimeZone(): string {
  return useContext(TimeZoneContext) ?? deviceTimeZone();
}
