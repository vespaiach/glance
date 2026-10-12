"use client";

import type { ReactNode } from "react";
import { DEMO_BUILD } from "./demo";
import { FixtureParamsProvider, useShellSetup } from "./fixtureOptions";
import { NowProvider } from "./providers/now";
import { SeasonProvider } from "./providers/season";
import { DefaultSettingsProvider } from "./providers/settings";

export function SignedOutProviders({ children }: { children: ReactNode }) {
  const setup = useShellSetup(DEMO_BUILD);

  if (setup === undefined) return null;

  return (
    <NowProvider frozenAt={setup.options.frozenAt}>
      <DefaultSettingsProvider overrides={setup.options.overrides}>
        <SeasonProvider>
          <FixtureParamsProvider params={setup.params}>{children}</FixtureParamsProvider>
        </SeasonProvider>
      </DefaultSettingsProvider>
    </NowProvider>
  );
}
