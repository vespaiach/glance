"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/copy";
import { useSignedOutAccount, useSignInAuth } from "@/data/repos";
import { initialWeatherSetup } from "@/features/weather";
import { useBreakpoint } from "@/shell/breakpoint";
import { isInstalledApp } from "@/shell/installed";
import { useKeyboardInset } from "@/shell/keyboard";
import { useBrowserOnline } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useAmbientRoot } from "@/shell/useAmbientNavigate";
import { Toast } from "@/ui/Toast";
import { SignInView } from "./components/SignInView";
import {
  initialSignIn,
  openedLinkFrom,
  openedPath,
  openedViewFrom,
  type SignInAction,
} from "./signIn";
import { useScan } from "./useScan";
import { useSignIn } from "./useSignIn";

const TOASTS: Partial<Record<string, { text: string; ms: number }>> = {
  "signed-out-all": { text: copy.signIn.signedOutAll, ms: 4000 },
  "account-deleted": { text: copy.signIn.accountDeleted, ms: 5000 },
};

export function SignInScreen() {
  const router = useRouter();

  const [link] = useState(() => openedLinkFrom(window.location.search));

  const [opens] = useState(() => openedViewFrom(window.location.search));

  const signedOut = useSignedOutAccount();

  const clock = useNowStore();

  const auth = useSignInAuth();

  const flow = useSignIn({
    initial: initialSignIn(link, signedOut),
    initialSetup: initialWeatherSetup,
    auth,
    clock,
    onSignedIn: () => router.replace(openedPath(window.location.search)),
  });

  const online = useBrowserOnline();

  const [installed] = useState(isInstalledApp);

  const scan = useScan({ verifyLink: auth.verifyLink, online, onSignedIn: flow.scanned });

  const act = (action: SignInAction) => {
    if (action.type === "email" || action.type === "send") scan.act({ type: "dismiss" });

    flow.act(action);
  };

  const root = useRef<HTMLDivElement>(null);

  useAmbientRoot(root, usePathname());

  const toast = useParamToast();

  return (
    <>
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
        {...(installed && { scan })}
        onAction={act}
        rootRef={root}
      />
      {toast && <Toast>{toast}</Toast>}
    </>
  );
}

function useParamToast(): string | undefined {
  const [toast, setToast] = useState(
    () => TOASTS[new URLSearchParams(window.location.search).get("toast") ?? ""],
  );

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(undefined), toast.ms);

    return () => clearTimeout(timer);
  }, [toast]);

  return toast?.text;
}
