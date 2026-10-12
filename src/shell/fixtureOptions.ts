"use client";

import { useEffect, useState } from "react";
import { type FixtureParams, fixtureParamsFor, fixtureSheetTargets } from "@/data/repos";
import type { AccountSettings } from "@/domain/schemas";
import type { SheetRequest } from "./SheetHost";

export type ShellOptions = {
  frozenAt?: Date;
  overrides: Partial<AccountSettings>;
  pillDelayMs?: number;
};

export type ShellSetup = { params: FixtureParams; options: ShellOptions };

export function shellOptions(params: FixtureParams): ShellOptions {
  return {
    ...(params.now && { frozenAt: params.now }),
    overrides: {
      ...(params.clock && { clock: params.clock }),
      ...(params.season && { season: params.season }),
    },
    ...(params.net === "offline" && { pillDelayMs: 0 }),
  };
}

export function fixtureSheet(params: FixtureParams, today: string): SheetRequest | null {
  const time = params.time && { time: params.time };

  switch (params.sheet) {
    case "event":
      return { kind: "event", id: fixtureSheetTargets.event, ...time };
    case "newevent":
      return { kind: "newevent", day: today, ...time };
    case "note":
      return { kind: "note", id: fixtureSheetTargets.note };
    case "newnote":
      return { kind: "newnote" };
    default:
      return null;
  }
}

export function useShellSetup(demo: boolean): ShellSetup | undefined {
  const [setup, setSetup] = useState<ShellSetup>();

  useEffect(() => {
    const params = fixtureParamsFor(demo, window.location.search);

    setSetup({ params, options: shellOptions(params) });
  }, [demo]);

  return setup;
}
