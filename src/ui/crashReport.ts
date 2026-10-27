import { createContext } from "react";

export type CrashReport = (
  event: "zone-crashed",
  error: unknown,
  extra: { component?: string },
) => void;

export const CrashReportContext = createContext<CrashReport>(() => {});
