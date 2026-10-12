import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import type { AuthStatus, SignInAuth } from "@/data/repos";
import type { Account } from "@/domain/schemas";
import { type FixtureAccount, type SignInAction, type SignInState, signInReducer } from "./signIn";

export const POLL_MS = 2_000;

export const OPEN_TODAY_MS = 2_200;

type Options = {
  initial: SignInState;
  auth: SignInAuth;
  fixture: FixtureAccount;
  onSignedIn: () => void;
};

export type SignInFlow = {
  state: SignInState;
  act(action: SignInAction): void;
  openedLink(): void;
  finishedOnPhone(): void;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

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

export function useSignIn({ initial, auth, fixture, onSignedIn }: Options): SignInFlow {
  const [state, dispatch] = useReducer(signInReducer, initial);

  const mounted = useMounted();

  const finish = (account: Account) => {
    void Promise.all([auth.remember(account), wait(OPEN_TODAY_MS)]).then(() => {
      if (mounted.current) onSignedIn();
    });
  };

  const signedIn = (account: Account, returning: boolean) => {
    dispatch({ type: "status", status: { state: "signed-in", account, returning } });

    finish(account);
  };

  usePolling(isWaiting(state), auth.status, (status) => {
    if (status.state === "signed-in") return signedIn(status.account, status.returning);

    dispatch({ type: "status", status });
  });

  const sendLink = async (email: string) => {
    const answer = await auth.link({ email, timeZone: timeZone() });

    dispatch({ type: answer.ok ? "link-sent" : "link-failed" });
  };

  const saveName = async (draft: string) => {
    const answer = await auth.name(draft.trim());

    if (!answer.ok) return dispatch({ type: "name-failed" });

    dispatch({ type: "named", account: answer.value });

    finish(answer.value);
  };

  const act = (action: SignInAction) => {
    const next = signInReducer(state, action);

    dispatch(action);

    if (next === state) return;

    if (next.step === "sending") void sendLink(next.email);

    if (next.step === "name" && next.saving) void saveName(next.draft);
  };

  const openedLink = () => {
    if (state.step !== "sent") return;

    if (sameEmail(state.email, fixture.email)) return signedIn(fixture, true);

    dispatch({ type: "opened-link" });
  };

  const finishedOnPhone = () => {
    if (state.step === "phone") signedIn(fixture, false);
  };

  return { state, act, openedLink, finishedOnPhone };
}
