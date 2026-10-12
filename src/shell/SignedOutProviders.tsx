"use client";

import { type ReactNode, useMemo } from "react";
import { fixtureTimeZone, SignInAuthProvider, signInAuthFor } from "@/data/repos";
import { DEMO_BUILD } from "./demo";
import { FixtureParamsProvider, useShellSetup } from "./fixtureOptions";
import { NowProvider } from "./providers/now";
import { SeasonProvider } from "./providers/season";
import { DefaultSettingsProvider } from "./providers/settings";
import { TimeZoneProvider } from "./providers/timeZone";

export function SignedOutProviders({
  demo = DEMO_BUILD,
  children,
}: {
  demo?: boolean;
  children: ReactNode;
}) {
  const setup = useShellSetup(demo);

  const auth = useMemo(() => setup && signInAuthFor(demo, setup.params), [demo, setup]);

  if (setup === undefined || auth === undefined) return null;

  return (
    <NowProvider frozenAt={setup.options.frozenAt}>
      <DefaultSettingsProvider overrides={setup.options.overrides}>
        <TimeZoneProvider timeZone={demo ? fixtureTimeZone : undefined}>
          <SeasonProvider>
            <FixtureParamsProvider params={setup.params}>
              <SignInAuthProvider auth={auth}>{children}</SignInAuthProvider>
            </FixtureParamsProvider>
          </SeasonProvider>
        </TimeZoneProvider>
      </DefaultSettingsProvider>
    </NowProvider>
  );
}
