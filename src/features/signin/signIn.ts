import { type AuthStatus, type FixtureParams, fixtureOtherEmail } from "@/data/repos";
import type { Account } from "@/domain/schemas";
import { DIFFERENT_EMAIL_WAIT_S, isValidEmail } from "@/domain/signIn";

export type SignInState =
  | { step: "opening" }
  | { step: "form"; email: string; error?: "invalid" | "failed" | "guest" }
  | { step: "sending"; email: string }
  | { step: "guest"; email: string }
  | { step: "sent"; email: string; sentAt: Date }
  | { step: "name"; email: string; draft: string; error?: "empty" | "failed"; saving?: true }
  | { step: "location"; account: Account; returning: boolean; skipping?: true }
  | { step: "phone"; email: string }
  | { step: "expired"; email: string; onLink: boolean }
  | { step: "done"; name: string; returning: boolean };

export type SignInAction =
  | { type: "email"; email: string }
  | { type: "send" }
  | { type: "guest" }
  | { type: "guest-failed" }
  | { type: "back" }
  | { type: "name"; draft: string }
  | { type: "submit-name" }
  | { type: "link-sent"; at: Date }
  | { type: "link-failed" }
  | { type: "status"; status: AuthStatus }
  | { type: "status-failed" }
  | { type: "named"; account: Account }
  | { type: "name-failed" }
  | { type: "skip" }
  | { type: "skip-failed" }
  | { type: "setup-done" };

export type SignInFixture = Pick<FixtureParams, "signin" | "on" | "acct" | "switch" | "backin">;

export type FixtureAccount = Account & { name: string };

export type OpenedLink = "opened" | "stale";

const EMPTY_FORM: SignInState = { step: "form", email: "" };

export function signInReducer(state: SignInState, action: SignInAction): SignInState {
  switch (action.type) {
    case "email":
      return state.step === "form" ? { step: "form", email: action.email } : state;
    case "send":
      return send(state);
    case "guest":
      return state.step === "form" ? { step: "guest", email: state.email } : state;
    case "guest-failed":
      return state.step === "guest" ? { step: "form", email: state.email, error: "guest" } : state;
    case "back":
      return back(state);
    case "name":
      return typeName(state, action.draft);
    case "submit-name":
      return submitName(state);
    case "link-sent":
      return linkSent(state, action.at);
    case "link-failed":
      return linkFailed(state);
    case "status":
      return statusAnswered(state, action.status);
    case "status-failed":
      return state.step === "opening" ? EMPTY_FORM : state;
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
  now: Date,
  link?: OpenedLink,
  signedOut?: { email: string },
): SignInState {
  const { email, name } = account;

  if (link) return { step: "opening" };

  if (signedOut)
    return { step: "form", email: fixture.switch ? fixtureOtherEmail : signedOut.email };

  switch (fixture.signin) {
    case "sending":
    case "phone":
      return { step: fixture.signin, email };
    case "sent":
      return { step: "sent", email, sentAt: fixtureSentAt(now, fixture.backin) };
    case "offline":
      return { step: "form", email };
    case "sendfail":
      return { step: "form", email, error: "failed" };
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

function linkSent(state: SignInState, at: Date): SignInState {
  if (state.step !== "sending") return state;

  return { step: "sent", email: state.email, sentAt: at };
}

function linkFailed(state: SignInState): SignInState {
  if (state.step !== "sending") return state;

  return { step: "form", email: state.email, error: "failed" };
}

function fixtureSentAt(now: Date, backin = DIFFERENT_EMAIL_WAIT_S): Date {
  return new Date(now.getTime() - (DIFFERENT_EMAIL_WAIT_S - backin) * 1_000);
}

function signedIn(account: Account, returning: boolean, setupDone: boolean): SignInState {
  if (account.name === null) return { step: "name", email: account.email, draft: "" };

  if (!setupDone) return { step: "location", account, returning };

  return { step: "done", name: account.name, returning };
}

function linkChecked(status: AuthStatus): SignInState {
  if (status.state !== "signed-in") return EMPTY_FORM;

  return signedIn(status.account, status.returning, status.setupDone);
}

function guestChecked(email: string, status: AuthStatus): SignInState {
  if (status.state !== "signed-in") return { step: "form", email, error: "guest" };

  return signedIn(status.account, status.returning, status.setupDone);
}

function statusAnswered(state: SignInState, status: AuthStatus): SignInState {
  if (state.step === "opening") return linkChecked(status);

  if (state.step === "guest") return guestChecked(state.email, status);

  if (state.step !== "sent" && state.step !== "phone") return state;

  if (status.state !== "signed-in") return state;

  return signedIn(status.account, status.returning, status.setupDone);
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
