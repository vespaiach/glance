"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  type SignedOutAccount,
  SignedOutAccountProvider,
  SignInAuthProvider,
  signedOutAccount,
  signInAuth,
} from "@/data/repos";
import { NowProvider } from "./providers/now";
import { SeasonProvider } from "./providers/season";
import { DefaultSettingsProvider } from "./providers/settings";
import { TimeZoneProvider } from "./providers/timeZone";

type Loaded = { account: SignedOutAccount | undefined };

export function SignedOutProviders({ children }: { children: ReactNode }) {
  const [auth] = useState(signInAuth);

  const loaded = useSignedOutLoad();

  if (loaded === undefined) return null;

  return (
    <NowProvider>
      <DefaultSettingsProvider overrides={loaded.account?.settings}>
        <TimeZoneProvider>
          <SeasonProvider>
            <SignInAuthProvider auth={auth}>
              <SignedOutAccountProvider account={loaded.account}>
                {children}
              </SignedOutAccountProvider>
            </SignInAuthProvider>
          </SeasonProvider>
        </TimeZoneProvider>
      </DefaultSettingsProvider>
    </NowProvider>
  );
}

function useSignedOutLoad(): Loaded | undefined {
  const [loaded, setLoaded] = useState<Loaded>();

  useEffect(() => {
    let live = true;

    void signedOutAccount().then((account) => {
      if (live) setLoaded({ account });
    });

    return () => {
      live = false;
    };
  }, []);

  return loaded;
}
