import type { AuthStatus, CodeError, SignedIn, TransportError } from "@/data/repos";
import { QR_OPENS, type QrOpens } from "@/domain/qrSignIn";
import type { Account } from "@/domain/schemas";
import { CODE_LENGTH, codeDigits, codeExpired, isValidEmail } from "@/domain/signIn";
import { viewPath } from "@/shell/routes";

const IMPORT_PATH = "/settings/import";

export type SignInState =
  | { step: "opening" }
  | { step: "form"; email: string; error?: "invalid" | "failed" }
  | { step: "sending"; email: string }
  | { step: "sent"; email: string; sentAt: Date; code: string; wrong?: true }
  | { step: "checking"; email: string; sentAt: Date; code: string }
  | { step: "locked"; email: string; sentAt: Date }
  | { step: "expired"; email: string }
  | { step: "name"; email: string; draft: string; error?: "empty" | "failed"; saving?: true }
  | { step: "location"; account: Account; returning: boolean; skipping?: true }
  | { step: "done"; name: string; returning: boolean };

export type SignInAction =
  | { type: "email"; email: string }
  | { type: "send" }
  | { type: "back" }
  | { type: "name"; draft: string }
  | { type: "submit-name" }
  | { type: "code-sent"; at: Date }
  | { type: "send-failed" }
  | { type: "code"; text: string; online: boolean }
  | { type: "verify"; online: boolean }
  | { type: "rejected"; error: CodeError | TransportError }
  | { type: "tick"; now: Date }
  | { type: "status"; status: AuthStatus }
  | { type: "scanned"; status: SignedIn }
  | { type: "status-failed" }
  | { type: "named"; account: Account }
  | { type: "name-failed" }
  | { type: "skip" }
  | { type: "skip-failed" }
  | { type: "setup-done" };

type CodeStepState = Extract<SignInState, { step: "sent" | "checking" | "locked" | "expired" }>;

export type OpenedLink = "opened" | "stale";

const EMPTY_FORM: SignInState = { step: "form", email: "" };

const CODE_STEPS: readonly SignInState["step"][] = ["sent", "checking", "locked", "expired"];

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
    case "code-sent":
      return codeSent(state, action.at);
    case "send-failed":
      return sendFailed(state);
    case "code":
      return typeCode(state, action.text, action.online);
    case "verify":
      return state.step === "sent" ? verify(state, action.online) : state;
    case "rejected":
      return rejected(state, action.error);
    case "tick":
      return tick(state, action.now);
    case "status":
      return statusAnswered(state, action.status);
    case "scanned":
      return state.step === "form" ? linkChecked(action.status) : state;
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

export function openedViewFrom(search: string): "today" | QrOpens {
  const query = new URLSearchParams(search);

  const opened = query.get("link") === "opened";

  return (opened && QR_OPENS.find((view) => view === query.get("to"))) || "today";
}

export function openedPath(search: string): string {
  const view = openedViewFrom(search);

  if (view !== "import") return viewPath(view);

  const forDisplay = new URLSearchParams(search).get("forDisplay");

  return forDisplay ? `${IMPORT_PATH}?${new URLSearchParams({ forDisplay })}` : IMPORT_PATH;
}

export function initialSignIn(link?: OpenedLink, signedOut?: { email: string }): SignInState {
  if (link) return { step: "opening" };

  return signedOut ? { step: "form", email: signedOut.email } : EMPTY_FORM;
}

function send(state: SignInState): SignInState {
  if (isCodeStep(state)) return { step: "sending", email: state.email };

  if (state.step !== "form") return state;

  if (!isValidEmail(state.email)) return { ...state, error: "invalid" };

  return { step: "sending", email: state.email.trim() };
}

function back(state: SignInState): SignInState {
  if (!isCodeStep(state)) return state;

  return { step: "form", email: state.email };
}

function isCodeStep(state: SignInState): state is CodeStepState {
  return CODE_STEPS.includes(state.step);
}

function submitName(state: SignInState): SignInState {
  if (state.step !== "name" || state.saving) return state;

  if (state.draft.trim() === "") return { ...state, error: "empty" };

  return { step: "name", email: state.email, draft: state.draft, saving: true };
}

function codeSent(state: SignInState, at: Date): SignInState {
  if (state.step !== "sending") return state;

  return { step: "sent", email: state.email, sentAt: at, code: "" };
}

function sendFailed(state: SignInState): SignInState {
  if (state.step !== "sending") return state;

  return { step: "form", email: state.email, error: "failed" };
}

function typeCode(state: SignInState, text: string, online: boolean): SignInState {
  if (state.step !== "sent") return state;

  const code = codeDigits(text);

  const typed: SignInState = { step: "sent", email: state.email, sentAt: state.sentAt, code };

  return code.length > state.code.length ? verify(typed, online) : typed;
}

function verify(state: Extract<SignInState, { step: "sent" }>, online: boolean): SignInState {
  if (!online || state.code.length < CODE_LENGTH) return state;

  return { step: "checking", email: state.email, sentAt: state.sentAt, code: state.code };
}

function rejected(state: SignInState, error: CodeError | TransportError): SignInState {
  if (state.step !== "checking") return state;

  const { email, sentAt, code } = state;

  switch (error) {
    case "wrong-code":
      return { step: "sent", email, sentAt, code: "", wrong: true };
    case "code-locked":
      return { step: "locked", email, sentAt };
    case "code-expired":
      return { step: "expired", email };
    default:
      return { step: "sent", email, sentAt, code };
  }
}

function tick(state: SignInState, now: Date): SignInState {
  if (state.step !== "sent" || !codeExpired(state.sentAt, now)) return state;

  return { step: "expired", email: state.email };
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

function statusAnswered(state: SignInState, status: AuthStatus): SignInState {
  if (state.step === "opening") return linkChecked(status);

  if (state.step !== "checking") return state;

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
