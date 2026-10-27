"use client";

import { type ReactNode, useEffect } from "react";
import { createErrorReporter, type ReportError } from "@/data/repos";
import { CrashReportContext } from "@/ui/crashReport";

let reporter: ReportError | undefined;

export function reportPageError(...args: Parameters<ReportError>): void {
  reporter ??= createErrorReporter({ page: () => location.pathname });

  reporter(...args);
}

export function ErrorReporter({ children }: { children: ReactNode }) {
  useEffect(() => {
    const controller = new AbortController();

    const { signal } = controller;

    window.addEventListener(
      "error",
      (event) => reportPageError("uncaught", event.error ?? event.message),
      { signal },
    );

    window.addEventListener(
      "unhandledrejection",
      (event) => reportPageError("uncaught", event.reason),
      {
        signal,
      },
    );

    return () => controller.abort();
  }, []);

  return <CrashReportContext value={reportPageError}>{children}</CrashReportContext>;
}
