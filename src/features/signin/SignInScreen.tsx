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
import { initialSignIn, openedLinkFrom, openedViewFrom } from "./signIn";
import { useSignIn } from "./useSignIn";

export function SignInScreen() {
  const router = useRouter();

  const params = useFixtureParams();

  const [link] = useState(() => openedLinkFrom(window.location.search));

  const [opens] = useState(() => openedViewFrom(window.location.search));

  const signedOut = useSignedOutAccount();

  const clock = useNowStore();

  const flow = useSignIn({
    initial: initialSignIn(params, fixtureSignIn, clock.get(), link, signedOut),
    initialSetup: () => initialWeatherSetup(params.wx, fixtureWeatherSearch),
    auth: useSignInAuth(),
    clock,
    onSignedIn: () => router.replace(viewPath(opens)),
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
      guest={flow.guest}
      {...(opens !== "today" && { opens })}
      onAction={flow.act}
      rootRef={root}
    />
  );
}
