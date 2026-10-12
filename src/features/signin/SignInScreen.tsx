"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fixtureSignIn, useSignInAuth } from "@/data/repos";
import { useBreakpoint } from "@/shell/breakpoint";
import { DEMO_BUILD } from "@/shell/demo";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useFixtureFieldFocus, useKeyboardInset } from "@/shell/keyboard";
import { useBrowserOnline } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { viewPath } from "@/shell/routes";
import { SignInView } from "./components/SignInView";
import { initialSignIn, openedLinkFrom } from "./signIn";
import { useSignIn } from "./useSignIn";

export function SignInScreen({ demo = DEMO_BUILD }: { demo?: boolean }) {
  const router = useRouter();

  const params = useFixtureParams();

  const [link] = useState(() => openedLinkFrom(window.location.search));

  const flow = useSignIn({
    initial: initialSignIn(params, fixtureSignIn, link),
    auth: useSignInAuth(),
    fixture: fixtureSignIn,
    onSignedIn: () => router.replace(viewPath("today")),
  });

  const online = useBrowserOnline() && params.signin !== "offline";

  useFixtureFieldFocus();

  return (
    <SignInView
      state={flow.state}
      season={useSeason()}
      time={useNow("minute")}
      clock={useAccountSettings().clock}
      tz={useTimeZone()}
      breakpoint={useBreakpoint()}
      keyboardInset={useKeyboardInset()}
      online={online}
      demo={demo}
      onAction={flow.act}
      onDemo={() => router.push(viewPath("today"))}
      onOpenedLink={flow.openedLink}
      onFinishedOnPhone={flow.finishedOnPhone}
    />
  );
}
