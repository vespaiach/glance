"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { RepoProvider, useDisplayBoot } from "@/data/repos";
import { IdleProvider } from "./providers/idle";
import { NetworkProvider } from "./providers/network";
import { NowProvider, useNowStore } from "./providers/now";
import { SeasonProvider } from "./providers/season";
import { SettingsProvider } from "./providers/settings";
import { TimeZoneProvider } from "./providers/timeZone";
import { WhoFilterProvider } from "./providers/whoFilter";
import { ReminderHost } from "./ReminderHost";
import { SessionGuard } from "./SessionGuard";
import { SheetHost } from "./SheetHost";

const SIGN_IN = "/signin";

export function DisplayProviders({ children }: { children: ReactNode }) {
  return (
    <NowProvider>
      <DisplaySession>{children}</DisplaySession>
    </NowProvider>
  );
}

function DisplaySession({ children }: { children: ReactNode }) {
  const { get } = useNowStore();

  const boot = useDisplayBoot(get);

  const router = useRouter();

  const signedOut = boot.kind === "signed-out";

  useEffect(() => {
    if (signedOut) router.replace(SIGN_IN);
  }, [signedOut, router]);

  if (boot.kind !== "ready") return null;

  return (
    <RepoProvider store={boot.store}>
      <SettingsProvider>
        <TimeZoneProvider>
          <SeasonProvider>
            <NetworkProvider>
              <SheetHost>
                <WhoFilterProvider>
                  <IdleProvider>
                    <SessionGuard>{children}</SessionGuard>
                    <ReminderHost />
                  </IdleProvider>
                </WhoFilterProvider>
              </SheetHost>
            </NetworkProvider>
          </SeasonProvider>
        </TimeZoneProvider>
      </SettingsProvider>
    </RepoProvider>
  );
}
