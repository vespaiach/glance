"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { type FixtureParams, RepoProvider, useDisplayBoot } from "@/data/repos";
import { localDateKey } from "@/domain/time";
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
import { SheetHost } from "./SheetHost";

const SIGN_IN = "/signin";

type SessionProps = {
  demo: boolean;
  params: FixtureParams;
  options: ShellOptions;
  children: ReactNode;
};

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
        <SeasonProvider>
          <NetworkProvider pillDelayMs={options.pillDelayMs}>
            <SheetHost initial={fixtureSheet(params, localDateKey(get()))}>
              <FixtureParamsProvider params={params}>
                <IdleProvider>{children}</IdleProvider>
              </FixtureParamsProvider>
            </SheetHost>
          </NetworkProvider>
        </SeasonProvider>
      </SettingsProvider>
    </RepoProvider>
  );
}

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
