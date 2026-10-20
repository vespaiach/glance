"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  fixtureSignIn,
  fixtureWeatherSearch,
  useSignedOutAccount,
  useSignInAuth,
} from "@/data/repos";
import { initialWeatherSetup } from "@/features/weather";
import { useBreakpoint } from "@/shell/breakpoint";
import { DEMO_BUILD } from "@/shell/demo";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useFixtureFieldFocus, useKeyboardInset } from "@/shell/keyboard";
import { useBrowserOnline } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { viewPath } from "@/shell/routes";
import { useAmbientRoot } from "@/shell/useAmbientNavigate";
import { SignInView } from "./components/SignInView";
import { initialSignIn, openedLinkFrom } from "./signIn";
import { useSignIn } from "./useSignIn";

export function SignInScreen({ demo = DEMO_BUILD }: { demo?: boolean }) {
  const router = useRouter();

  const params = useFixtureParams();

  const [link] = useState(() => openedLinkFrom(window.location.search));

  const signedOut = useSignedOutAccount();

  const clock = useNowStore();

  const flow = useSignIn({
    initial: initialSignIn(params, fixtureSignIn, clock.get(), link, signedOut),
    initialSetup: () => initialWeatherSetup(params.wx, fixtureWeatherSearch),
    auth: useSignInAuth(),
    fixture: fixtureSignIn,
    now: clock.get,
    onSignedIn: () => router.replace(viewPath("today")),
  });

  const online = useBrowserOnline() && params.signin !== "offline";

  useFixtureFieldFocus();

  const root = useRef<HTMLDivElement>(null);

  useAmbientRoot(root, usePathname());

  return (
    <SignInView
      state={flow.state}
      signedOut={signedOut}
      setup={flow.setup}
      season={useSeason()}
      time={useNow(flow.state.step === "sent" ? "second" : "minute")}
      clock={useAccountSettings().clock}
      tz={useTimeZone()}
      breakpoint={useBreakpoint()}
      keyboardInset={useKeyboardInset()}
      online={online}
      demo={demo}
      guest={flow.guest}
      onAction={flow.act}
      onFinishedOnPhone={flow.finishedOnPhone}
      rootRef={root}
    />
  );
}
