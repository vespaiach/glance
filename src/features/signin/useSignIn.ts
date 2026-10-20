import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import type { AuthStatus, SignInAuth } from "@/data/repos";
import type { Account, LocationRequest, WeatherLocation } from "@/domain/schemas";
import { useWeatherSetup, type WeatherSetupFlow, type WeatherSetupState } from "@/features/weather";
import { type FixtureAccount, type SignInAction, type SignInState, signInReducer } from "./signIn";

export const POLL_MS = 2_000;

export const OPEN_TODAY_MS = 2_200;

type Options = {
  initial: SignInState;
  initialSetup: () => WeatherSetupState;
  auth: SignInAuth;
  fixture: FixtureAccount;
  now: () => Date;
  onSignedIn: () => void;
};

export type SignInFlow = {
  state: SignInState;
  guest: boolean;
  setup: WeatherSetupFlow;
  act(action: SignInAction): void;
  finishedOnPhone(): void;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useSignIn({
  initial,
  initialSetup,
  auth,
  fixture,
  now,
  onSignedIn,
}: Options): SignInFlow {
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

  const signedIn = (account: Account, returning: boolean) =>
    statusAnswered({ state: "signed-in", account, returning, setupDone: true });

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

  usePolling(isWaiting(state), auth.status, statusAnswered);

  useLinkCheck(state.step === "opening", auth.status, (answer) => {
    if (!answer.ok) return dispatch({ type: "status-failed" });

    statusAnswered(answer.value);
  });

  const guest = useGuestAvailable(auth.guestAvailable);

  const signInAsGuest = async () => {
    const answer = await auth.guest();

    if (!answer.ok) return dispatch({ type: "guest-failed" });

    statusAnswered(answer.value);
  };

  const sendLink = async (email: string) => {
    const answer = await auth.link({ email, timeZone: timeZone() });

    dispatch(answer.ok ? { type: "link-sent", at: now() } : { type: "link-failed" });
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

    if (next.step === "sending") void sendLink(next.email);

    if (next.step === "guest") void signInAsGuest();

    if (next.step === "name" && next.saving) void saveName(next.draft);

    if (next.step === "location" && next.skipping) skip(next.account);
  };

  const finishedOnPhone = () => {
    if (state.step === "phone") signedIn(fixture, false);
  };

  return { state, guest, setup, act, finishedOnPhone };
}

function isWaiting(state: SignInState): boolean {
  return state.step === "sent" || state.step === "phone";
}

function usePolling(
  waiting: boolean,
  status: SignInAuth["status"],
  onStatus: (answer: AuthStatus) => void,
) {
  const answered = useEffectEvent(onStatus);

  useEffect(() => {
    if (!waiting) return;

    let live = true;

    const poll = async () => {
      const answer = await status();

      if (live && answer.ok) answered(answer.value);
    };

    const timer = setInterval(() => void poll(), POLL_MS);

    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [waiting, status]);
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

function useGuestAvailable(guestAvailable: SignInAuth["guestAvailable"]): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let live = true;

    void guestAvailable().then((on) => {
      if (live) setAvailable(on);
    });

    return () => {
      live = false;
    };
  }, [guestAvailable]);

  return available;
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
