import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import type { AuthStatus, SignInAuth } from "@/data/repos";
import type { Account, LocationRequest, WeatherLocation } from "@/domain/schemas";
import { useWeatherSetup, type WeatherSetupFlow, type WeatherSetupState } from "@/features/weather";
import type { NowStore } from "@/shell/providers/now";
import { type SignInAction, type SignInState, signInReducer } from "./signIn";

export const OPEN_TODAY_MS = 2_200;

type Options = {
  initial: SignInState;
  initialSetup: () => WeatherSetupState;
  auth: SignInAuth;
  clock: NowStore;
  onSignedIn: () => void;
};

export type SignInFlow = {
  state: SignInState;
  setup: WeatherSetupFlow;
  act(action: SignInAction): void;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useSignIn({ initial, initialSetup, auth, clock, onSignedIn }: Options): SignInFlow {
  const [state, dispatch] = useReducer(signInReducer, initial);

  const mounted = useMounted();

  const finish = (account: Account) => {
    void Promise.all([auth.remember(account), wait(OPEN_TODAY_MS)]).then(() => {
      if (mounted.current) onSignedIn();
    });
  };

  const statusAnswered = (status: AuthStatus) => {
    dispatch({ type: "status", status });

    if (status.state !== "signed-in" || !status.setupDone) return;

    if (status.account.name !== null) finish(status.account);
  };

  const endSetup = async (account: Account, request: LocationRequest) => {
    const answer = await auth.location(request);

    if (!answer.ok) return false;

    dispatch({ type: "setup-done" });

    finish(account);

    return true;
  };

  const setup = useWeatherSetup({
    initial: initialSetup,
    source: auth,
    save: (place: WeatherLocation) =>
      state.step === "location" ? endSetup(state.account, { place }) : Promise.resolve(false),
  });

  const skip = (account: Account) =>
    setup.skip(async () => {
      const ended = await endSetup(account, { skip: true });

      if (!ended) dispatch({ type: "skip-failed" });

      return ended;
    });

  useCodeExpiry(state.step === "sent", clock, (now) => dispatch({ type: "tick", now }));

  useLinkCheck(state.step === "opening", auth.status, (answer) => {
    if (!answer.ok) return dispatch({ type: "status-failed" });

    statusAnswered(answer.value);
  });

  const sendCode = async (email: string) => {
    const answer = await auth.sendCode({ email, timeZone: timeZone() });

    dispatch(answer.ok ? { type: "code-sent", at: clock.get() } : { type: "send-failed" });
  };

  const verifyCode = async (email: string, code: string) => {
    const answer = await auth.verifyCode({ email, code });

    if (!answer.ok) return dispatch({ type: "rejected", error: answer.error });

    statusAnswered(answer.value);
  };

  const saveName = async (draft: string) => {
    const answer = await auth.name(draft.trim());

    if (!answer.ok) return dispatch({ type: "name-failed" });

    dispatch({ type: "named", account: answer.value });
  };

  const act = (action: SignInAction) => {
    const next = signInReducer(state, action);

    dispatch(action);

    if (next === state) return;

    if (next.step === "sending") void sendCode(next.email);

    if (next.step === "checking") void verifyCode(next.email, next.code);

    if (next.step === "name" && next.saving) void saveName(next.draft);

    if (next.step === "location" && next.skipping) skip(next.account);
  };

  return { state, setup, act };
}

function useCodeExpiry(open: boolean, clock: NowStore, onTick: (now: Date) => void) {
  const ticked = useEffectEvent(onTick);

  useEffect(() => {
    if (!open) return;

    return clock.subscribe(() => ticked(clock.get()));
  }, [open, clock]);
}

function useLinkCheck(
  checking: boolean,
  status: SignInAuth["status"],
  onAnswer: (answer: Awaited<ReturnType<SignInAuth["status"]>>) => void,
) {
  const answered = useEffectEvent(onAnswer);

  useEffect(() => {
    if (!checking) return;

    let live = true;

    void status().then((answer) => {
      if (live) answered(answer);
    });

    return () => {
      live = false;
    };
  }, [checking, status]);
}

function useMounted() {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted;
}
