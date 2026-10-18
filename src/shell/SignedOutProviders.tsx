"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type FixtureParams,
  fixtureTimeZone,
  type SignedOutAccount,
  SignedOutAccountProvider,
  SignInAuthProvider,
  signedOutAccountFor,
  signInAuthFor,
} from "@/data/repos";
import { DEMO_BUILD } from "./demo";
import { FixtureParamsProvider, useShellSetup } from "./fixtureOptions";
import { NowProvider } from "./providers/now";
import { SeasonProvider } from "./providers/season";
import { DefaultSettingsProvider } from "./providers/settings";
import { TimeZoneProvider } from "./providers/timeZone";

type Loaded = { account: SignedOutAccount | undefined };

export function SignedOutProviders({
  demo = DEMO_BUILD,
  children,
}: {
  demo?: boolean;
  children: ReactNode;
}) {
  const setup = useShellSetup(demo);

  const auth = useMemo(() => setup && signInAuthFor(demo, setup.params), [demo, setup]);

  const loaded = useSignedOutLoad(demo, setup?.params);

  const overrides = useMemo(
    () => ({ ...loaded?.account?.settings, ...setup?.options.overrides }),
    [loaded, setup],
  );

  if (setup === undefined || auth === undefined || loaded === undefined) return null;

  return (
    <NowProvider frozenAt={setup.options.frozenAt}>
      <DefaultSettingsProvider overrides={overrides}>
        <TimeZoneProvider timeZone={demo ? fixtureTimeZone : undefined}>
          <SeasonProvider>
            <FixtureParamsProvider params={setup.params}>
              <SignInAuthProvider auth={auth}>
                <SignedOutAccountProvider account={loaded.account}>
                  {children}
                </SignedOutAccountProvider>
              </SignInAuthProvider>
            </FixtureParamsProvider>
          </SeasonProvider>
        </TimeZoneProvider>
      </DefaultSettingsProvider>
    </NowProvider>
  );
}

function useSignedOutLoad(demo: boolean, params: FixtureParams | undefined): Loaded | undefined {
  const [loaded, setLoaded] = useState<Loaded>();

  useEffect(() => {
    if (params === undefined) return;

    let live = true;

    void signedOutAccountFor(demo, params).then((account) => {
      if (live) setLoaded({ account });
    });

    return () => {
      live = false;
    };
  }, [demo, params]);

  return loaded;
}
