import type { FixtureParams } from "@/data/repos";
import { isValidEmail } from "@/domain/signIn";

export type SignInState =
  | { step: "form"; email: string; error?: "invalid" }
  | { step: "sending"; email: string }
  | { step: "sent"; email: string }
  | { step: "name"; email: string; draft: string; error?: "empty" }
  | { step: "phone"; email: string }
  | { step: "expired"; email: string; onLink: boolean }
  | { step: "done"; name: string; returning: boolean };

export type SignInAction =
  | { type: "email"; email: string }
  | { type: "send" }
  | { type: "back" }
  | { type: "name"; draft: string }
  | { type: "submit-name" };

export type SignInFixture = Pick<FixtureParams, "signin" | "on" | "acct">;

export type FixtureAccount = { email: string; name: string };

function send(state: SignInState): SignInState {
  if (state.step === "expired") return { step: "sending", email: state.email };

  if (state.step !== "form") return state;

  if (!isValidEmail(state.email)) return { ...state, error: "invalid" };

  return { step: "sending", email: state.email.trim() };
}

function back(state: SignInState): SignInState {
  if (state.step !== "sent" && state.step !== "phone" && state.step !== "expired") return state;

  return { step: "form", email: state.email };
}

function submitName(state: SignInState): SignInState {
  if (state.step !== "name" || state.draft.trim() !== "") return state;

  return { ...state, error: "empty" };
}

export function signInReducer(state: SignInState, action: SignInAction): SignInState {
  switch (action.type) {
    case "email":
      return state.step === "form" ? { step: "form", email: action.email } : state;
    case "send":
      return send(state);
    case "back":
      return back(state);
    case "name":
      return state.step === "name"
        ? { step: "name", email: state.email, draft: action.draft }
        : state;
    case "submit-name":
      return submitName(state);
  }
}

export function initialSignIn(fixture: SignInFixture, account: FixtureAccount): SignInState {
  const { email, name } = account;

  switch (fixture.signin) {
    case "sending":
    case "sent":
    case "phone":
      return { step: fixture.signin, email };
    case "offline":
      return { step: "form", email };
    case "name":
      return { step: "name", email, draft: "" };
    case "expired":
      return { step: "expired", email, onLink: fixture.on === "link" };
    case "done":
      return { step: "done", name, returning: fixture.acct === "returning" };
    default:
      return { step: "form", email: "" };
  }
}
