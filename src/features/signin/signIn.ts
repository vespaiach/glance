import type { AuthStatus, FixtureParams } from "@/data/repos";
import type { Account } from "@/domain/schemas";
import { isValidEmail } from "@/domain/signIn";

export type SignInState =
  | { step: "opening" }
  | { step: "form"; email: string; error?: "invalid" | "failed" }
  | { step: "sending"; email: string }
  | { step: "sent"; email: string }
  | { step: "name"; email: string; draft: string; error?: "empty" | "failed"; saving?: true }
  | { step: "location"; account: Account; returning: boolean; skipping?: true }
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
  | { type: "status-failed" }
  | { type: "opened-link" }
  | { type: "named"; account: Account }
  | { type: "name-failed" }
  | { type: "skip" }
  | { type: "skip-failed" }
  | { type: "setup-done" };

export type SignInFixture = Pick<FixtureParams, "signin" | "on" | "acct">;

export type FixtureAccount = Account & { name: string };

export type OpenedLink = "opened" | "stale";

const EMPTY_FORM: SignInState = { step: "form", email: "" };

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

function signedIn(account: Account, returning: boolean, setupDone: boolean): SignInState {
  if (account.name === null) return { step: "name", email: account.email, draft: "" };

  if (!setupDone) return { step: "location", account, returning };

  return { step: "done", name: account.name, returning };
}

function linkChecked(status: AuthStatus): SignInState {
  switch (status.state) {
    case "signed-in":
      return signedIn(status.account, status.returning, status.setupDone);
    case "expired":
      return status.email ? { step: "expired", email: status.email, onLink: true } : EMPTY_FORM;
    default:
      return EMPTY_FORM;
  }
}

function statusAnswered(state: SignInState, status: AuthStatus): SignInState {
  if (state.step === "opening") return linkChecked(status);

  if (state.step !== "sent" && state.step !== "phone") return state;

  switch (status.state) {
    case "waiting":
      return state;
    case "expired":
      return { step: "expired", email: state.email, onLink: false };
    case "finishing-elsewhere":
      return state.step === "phone" ? state : { step: "phone", email: state.email };
    case "signed-in":
      return signedIn(status.account, status.returning, status.setupDone);
  }
}

function named(state: SignInState, account: Account): SignInState {
  if (state.step !== "name" || !state.saving) return state;

  return { step: "location", account, returning: false };
}

function nameFailed(state: SignInState): SignInState {
  if (state.step !== "name" || !state.saving) return state;

  return { step: "name", email: state.email, draft: state.draft, error: "failed" };
}

function typeName(state: SignInState, draft: string): SignInState {
  if (state.step !== "name" || state.saving) return state;

  return { step: "name", email: state.email, draft };
}

function skip(state: SignInState): SignInState {
  if (state.step !== "location" || state.skipping) return state;

  return { ...state, skipping: true };
}

function skipFailed(state: SignInState): SignInState {
  if (state.step !== "location" || !state.skipping) return state;

  return { step: "location", account: state.account, returning: state.returning };
}

function setupDone(state: SignInState): SignInState {
  if (state.step !== "location") return state;

  return { step: "done", name: state.account.name ?? "", returning: state.returning };
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
    case "status-failed":
      return state.step === "opening" ? EMPTY_FORM : state;
    case "opened-link":
      return state.step === "sent" ? { step: "name", email: state.email, draft: "" } : state;
    case "named":
      return named(state, action.account);
    case "name-failed":
      return nameFailed(state);
    case "skip":
      return skip(state);
    case "skip-failed":
      return skipFailed(state);
    case "setup-done":
      return setupDone(state);
  }
}

export function openedLinkFrom(search: string): OpenedLink | undefined {
  const link = new URLSearchParams(search).get("link");

  return link === "opened" || link === "stale" ? link : undefined;
}

export function initialSignIn(
  fixture: SignInFixture,
  account: FixtureAccount,
  link?: OpenedLink,
): SignInState {
  const { email, name } = account;

  if (link) return { step: "opening" };

  switch (fixture.signin) {
    case "sending":
    case "sent":
    case "phone":
      return { step: fixture.signin, email };
    case "offline":
      return { step: "form", email };
    case "name":
      return { step: "name", email, draft: "" };
    case "location":
      return { step: "location", account, returning: false };
    case "expired":
      return { step: "expired", email, onLink: fixture.on === "link" };
    case "done":
      return { step: "done", name, returning: fixture.acct === "returning" };
    default:
      return EMPTY_FORM;
  }
}
