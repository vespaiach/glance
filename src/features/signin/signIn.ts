import type { AuthStatus, FixtureParams } from "@/data/repos";
import type { Account } from "@/domain/schemas";
import { isValidEmail } from "@/domain/signIn";

export type SignInState =
  | { step: "form"; email: string; error?: "invalid" | "failed" }
  | { step: "sending"; email: string }
  | { step: "sent"; email: string }
  | { step: "name"; email: string; draft: string; error?: "empty" | "failed"; saving?: true }
  | { step: "phone"; email: string }
  | { step: "expired"; email: string; onLink: boolean }
  | { step: "done"; name: string; returning: boolean };

export type SignInAction =
  | { type: "email"; email: string }
  | { type: "send" }
  | { type: "back" }
  | { type: "name"; draft: string }
  | { type: "submit-name" }
  | { type: "link-sent" }
  | { type: "link-failed" }
  | { type: "status"; status: AuthStatus }
  | { type: "opened-link" }
  | { type: "named"; account: Account }
  | { type: "name-failed" };

export type SignInFixture = Pick<FixtureParams, "signin" | "on" | "acct">;

export type FixtureAccount = Account & { name: string };

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
  if (state.step !== "name" || state.saving) return state;

  if (state.draft.trim() === "") return { ...state, error: "empty" };

  return { step: "name", email: state.email, draft: state.draft, saving: true };
}

function linkAnswered(state: SignInState, sent: boolean): SignInState {
  if (state.step !== "sending") return state;

  if (sent) return { step: "sent", email: state.email };

  return { step: "form", email: state.email, error: "failed" };
}

function signedIn(account: Account, returning: boolean): SignInState {
  return { step: "done", name: account.name ?? "", returning };
}

function statusAnswered(state: SignInState, status: AuthStatus): SignInState {
  if (state.step !== "sent" && state.step !== "phone") return state;

  switch (status.state) {
    case "waiting":
      return state;
    case "expired":
      return { step: "expired", email: state.email, onLink: false };
    case "needs-name-elsewhere":
      return state.step === "phone" ? state : { step: "phone", email: state.email };
    case "signed-in":
      return signedIn(status.account, status.returning);
  }
}

function named(state: SignInState, account: Account): SignInState {
  return state.step === "name" && state.saving ? signedIn(account, false) : state;
}

function nameFailed(state: SignInState): SignInState {
  if (state.step !== "name" || !state.saving) return state;

  return { step: "name", email: state.email, draft: state.draft, error: "failed" };
}

function typeName(state: SignInState, draft: string): SignInState {
  if (state.step !== "name" || state.saving) return state;

  return { step: "name", email: state.email, draft };
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
      return typeName(state, action.draft);
    case "submit-name":
      return submitName(state);
    case "link-sent":
      return linkAnswered(state, true);
    case "link-failed":
      return linkAnswered(state, false);
    case "status":
      return statusAnswered(state, action.status);
    case "opened-link":
      return state.step === "sent" ? { step: "name", email: state.email, draft: "" } : state;
    case "named":
      return named(state, action.account);
    case "name-failed":
      return nameFailed(state);
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
