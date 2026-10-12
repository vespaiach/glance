"use client";

import { useEffect, useState } from "react";
import { type FixtureParams, fixtureParamsFor } from "@/data/repos";
import type { AccountSettings } from "@/domain/schemas";

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

export function useShellSetup(demo: boolean): ShellSetup | undefined {
  const [setup, setSetup] = useState<ShellSetup>();

  useEffect(() => {
    const params = fixtureParamsFor(demo, window.location.search);

    setSetup({ params, options: shellOptions(params) });
  }, [demo]);

  return setup;
}
