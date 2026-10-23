"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { type FixtureParams, RepoProvider, useDisplayBoot } from "@/data/repos";
import { dateKey } from "@/domain/zone";
import { DEMO_BUILD } from "./demo";
import {
  FixtureParamsProvider,
  fixtureSheet,
  type ShellOptions,
  useShellSetup,
} from "./fixtureOptions";
import { IdleProvider } from "./providers/idle";
import { NetworkProvider } from "./providers/network";
import { NowProvider, useNowStore } from "./providers/now";
import { SeasonProvider } from "./providers/season";
import { SettingsProvider } from "./providers/settings";
import { TimeZoneProvider, useTimeZone } from "./providers/timeZone";
import { WhoFilterProvider } from "./providers/whoFilter";
import { SessionGuard } from "./SessionGuard";
import { SheetHost } from "./SheetHost";

const SIGN_IN = "/signin";

type SessionProps = {
  demo: boolean;
  params: FixtureParams;
  options: ShellOptions;
  children: ReactNode;
};

export function DisplayProviders({
  demo = DEMO_BUILD,
  children,
}: {
  demo?: boolean;
  children: ReactNode;
}) {
  const setup = useShellSetup(demo);

  if (setup === undefined) return null;

  return (
    <NowProvider frozenAt={setup.options.frozenAt}>
      <DisplaySession demo={demo} params={setup.params} options={setup.options}>
        {children}
      </DisplaySession>
    </NowProvider>
  );
}

function FixtureSheetHost({ params, children }: { params: FixtureParams; children: ReactNode }) {
  const { get } = useNowStore();

  const tz = useTimeZone();

  return <SheetHost initial={fixtureSheet(params, dateKey(get(), tz))}>{children}</SheetHost>;
}

function DisplaySession({ demo, params, options, children }: SessionProps) {
  const { get } = useNowStore();

  const boot = useDisplayBoot({ demo, params, now: get });

  const router = useRouter();

  const signedOut = boot.kind === "signed-out";

  useEffect(() => {
    if (signedOut) router.replace(SIGN_IN);
  }, [signedOut, router]);

  if (boot.kind !== "ready") return null;

  return (
    <RepoProvider store={boot.store}>
      <SettingsProvider overrides={options.overrides}>
        <TimeZoneProvider>
          <SeasonProvider>
            <NetworkProvider pillDelayMs={options.pillDelayMs}>
              <FixtureSheetHost params={params}>
                <FixtureParamsProvider params={params}>
                  <WhoFilterProvider initial={params.who}>
                    <IdleProvider>
                      <SessionGuard>{children}</SessionGuard>
                    </IdleProvider>
                  </WhoFilterProvider>
                </FixtureParamsProvider>
              </FixtureSheetHost>
            </NetworkProvider>
          </SeasonProvider>
        </TimeZoneProvider>
      </SettingsProvider>
    </RepoProvider>
  );
}
