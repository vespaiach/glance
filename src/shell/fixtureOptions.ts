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
  const sheet = fixtureSheetKind(params, today);

  return sheet && params.discard ? { ...sheet, discard: true } : sheet;
}

export function useShellSetup(demo: boolean): ShellSetup | undefined {
  const [setup, setSetup] = useState<ShellSetup>();

  useEffect(() => {
    const params = fixtureParamsFor(demo, window.location.search, window.location.pathname);

    setSetup({ params, options: shellOptions(params) });
  }, [demo]);

  return setup;
}

function startsOffline(params: FixtureParams): boolean {
  return params.net === "offline" || params.upload === "offline";
}

function fixtureSheetKind(params: FixtureParams, today: string): SheetRequest | null {
  const time = params.time && { time: params.time };

  const edit = !params.details && { edit: true as const };

  switch (params.sheet) {
    case "event":
      return { kind: "event", id: fixtureSheetTargets.event, ...time, ...edit };
    case "allday":
      return { kind: "event", id: fixtureSheetTargets.allDay, ...edit };
    case "past":
      return { kind: "event", id: fixtureSheetTargets.past, ...edit };
    case "newevent":
      return { kind: "newevent", day: today, ...time };
    case "note":
      return { kind: "note", id: fixtureSheetTargets.note, ...edit };
    case "newnote":
      return { kind: "newnote", draft: fixtureSheetTargets.noteDraft };
    case "family":
      return familySheet(params);
    case "photo":
      return { kind: "photo", id: fixtureSheetTargets.photo };
    case "photometa":
      return { kind: "photo", id: fixtureSheetTargets.photoMeta };
    default:
      return null;
  }
}

function familySheet({ rm, famname, famerr }: FixtureParams): SheetRequest {
  return {
    kind: "family",
    ...(rm && { removing: rm }),
    ...(famname && { name: famname }),
    ...(famerr && { error: true as const }),
  };
}
