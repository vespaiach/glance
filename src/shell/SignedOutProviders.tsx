"use client";

import { type ReactNode, useMemo } from "react";
import { SignInAuthProvider, signInAuthFor } from "@/data/repos";
import { DEMO_BUILD } from "./demo";
import { FixtureParamsProvider, useShellSetup } from "./fixtureOptions";
import { NowProvider } from "./providers/now";
import { SeasonProvider } from "./providers/season";
import { DefaultSettingsProvider } from "./providers/settings";

export function SignedOutProviders({ children }: { children: ReactNode }) {
  const setup = useShellSetup(DEMO_BUILD);

  const auth = useMemo(() => setup && signInAuthFor(DEMO_BUILD, setup.params), [setup]);

  if (setup === undefined || auth === undefined) return null;

  return (
    <NowProvider frozenAt={setup.options.frozenAt}>
      <DefaultSettingsProvider overrides={setup.options.overrides}>
        <SeasonProvider>
          <FixtureParamsProvider params={setup.params}>
            <SignInAuthProvider auth={auth}>{children}</SignInAuthProvider>
          </FixtureParamsProvider>
        </SeasonProvider>
      </DefaultSettingsProvider>
    </NowProvider>
  );
}
