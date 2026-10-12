"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { type FixtureParams, fixtureParamsFor, fixtureSheetTargets } from "@/data/repos";
import type { AccountSettings } from "@/domain/schemas";
import type { SheetRequest } from "./SheetHost";

export type ShellOptions = {
  frozenAt?: Date;
  overrides: Partial<AccountSettings>;
  pillDelayMs?: number;
};

export type ShellSetup = { params: FixtureParams; options: ShellOptions };

const FixtureParamsContext = createContext<FixtureParams>({});

export function FixtureParamsProvider({
  params,
  children,
}: {
  params: FixtureParams;
  children: ReactNode;
}) {
  return createElement(FixtureParamsContext, { value: params }, children);
}

export function useFixtureParams(): FixtureParams {
  return useContext(FixtureParamsContext);
}

function startsOffline(params: FixtureParams): boolean {
  return params.net === "offline" || params.upload === "offline";
}

export function shellOptions(params: FixtureParams): ShellOptions {
  return {
    ...(params.now && { frozenAt: params.now }),
    overrides: {
      ...(params.clock && { clock: params.clock }),
      ...(params.season && { season: params.season }),
    },
    ...(startsOffline(params) && { pillDelayMs: 0 }),
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
      return { kind: "newnote", draft: fixtureSheetTargets.noteDraft };
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
