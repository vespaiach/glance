"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useSignedOutAccount, useSignInAuth } from "@/data/repos";
import { initialWeatherSetup } from "@/features/weather";
import { useBreakpoint } from "@/shell/breakpoint";
import { useKeyboardInset } from "@/shell/keyboard";
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

  const [link] = useState(() => openedLinkFrom(window.location.search));

  const [opens] = useState(() => openedViewFrom(window.location.search));

  const signedOut = useSignedOutAccount();

  const clock = useNowStore();

  const flow = useSignIn({
    initial: initialSignIn(link, signedOut),
    initialSetup: initialWeatherSetup,
    auth: useSignInAuth(),
    clock,
    onSignedIn: () => router.replace(viewPath(opens)),
  });

  const online = useBrowserOnline();

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
      {...(opens !== "today" && { opens })}
      onAction={flow.act}
      rootRef={root}
    />
  );
}
