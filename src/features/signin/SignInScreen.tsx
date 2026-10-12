"use client";

import { useRouter } from "next/navigation";
import { useReducer } from "react";
import { fixtureSignIn } from "@/data/repos";
import { useBreakpoint } from "@/shell/breakpoint";
import { DEMO_BUILD } from "@/shell/demo";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useBrowserOnline } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { viewPath } from "@/shell/routes";
import { SignInView } from "./components/SignInView";
import { initialSignIn, signInReducer } from "./signIn";

const notYet = () => {};

export function SignInScreen({ demo = DEMO_BUILD }: { demo?: boolean }) {
  const router = useRouter();

  const params = useFixtureParams();

  const [state, dispatch] = useReducer(signInReducer, params, (fixture) =>
    initialSignIn(fixture, fixtureSignIn),
  );

  const online = useBrowserOnline() && params.signin !== "offline";

  return (
    <SignInView
      state={state}
      season={useSeason()}
      time={useNow("minute")}
      clock={useAccountSettings().clock}
      breakpoint={useBreakpoint()}
      online={online}
      demo={demo}
      onAction={dispatch}
      onDemo={() => router.push(viewPath("today"))}
      onOpenedLink={notYet}
      onFinishedOnPhone={notYet}
    />
  );
}
