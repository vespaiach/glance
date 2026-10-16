import "server-only";
import type { Account } from "@/domain/schemas";
import { type AccountRow, accountByEmail, toAccount } from "./account";
import type { Clocked } from "./deps";
import { deleteLink, type LinkRow, linkByPendingId } from "./links";
import { openDisplay } from "./sessions";
import { hashToken } from "./tokens";

export type AuthStatusBody =
  | { state: "waiting" }
  | { state: "expired"; email?: string }
  | { state: "finishing-elsewhere" }
  | { state: "signed-in"; account: Account; returning: boolean; setupDone: boolean };

export type StatusAnswer = { status: AuthStatusBody; sessionToken?: string };

export type StatusInput = {
  sessionToken?: string;
  pendingId?: string;
  linkEmail?: string;
  userAgent?: string;
};

type SessionRow = AccountRow & { session_created_at: string };

export async function authStatus(deps: Clocked, input: StatusInput): Promise<StatusAnswer> {
  const session = await sessionAccount(deps, input.sessionToken);

  if (session) return { status: signedIn(session, session.session_created_at) };

  const link =
    input.pendingId === undefined ? undefined : await linkByPendingId(deps.db, input.pendingId);

  if (link) return linkStatus(deps, link, input.userAgent);

  return { status: expired(input.linkEmail) };
}

async function sessionAccount(
  { db }: Clocked,
  sessionToken: string | undefined,
): Promise<SessionRow | undefined> {
  if (sessionToken === undefined) return undefined;

  return db.one<SessionRow>(
    "SELECT a.*, s.created_at AS session_created_at FROM sessions s JOIN displays d ON d.id = s.display_id JOIN accounts a ON a.id = d.account_id WHERE s.token_hash = $1",
    [hashToken(sessionToken)],
  );
}

async function linkStatus(
  deps: Clocked,
  link: LinkRow,
  userAgent: string | undefined,
): Promise<StatusAnswer> {
  if (link.used_at === null) return { status: unopened(deps, link) };

  const account = await accountByEmail(deps.db, link.email);

  if (account === undefined) return { status: expired(link.email) };

  if (account.name === null || account.setup_done_at === null) {
    return { status: { state: "finishing-elsewhere" } };
  }

  return claim(deps, link, account, { at: link.used_at, userAgent });
}

function unopened({ now }: Clocked, link: LinkRow): AuthStatusBody {
  return link.expires_at <= now().toISOString() ? expired(link.email) : { state: "waiting" };
}

async function claim(
  { db }: Clocked,
  link: LinkRow,
  account: AccountRow,
  opened: { at: string; userAgent: string | undefined },
): Promise<StatusAnswer> {
  const sessionToken = await db.tx(async (tx) => {
    await deleteLink(tx, link.token_hash);

    return openDisplay(tx, account.id, opened);
  });

  return { status: signedIn(account, opened.at), sessionToken };
}

function signedIn(account: AccountRow, since: string): AuthStatusBody {
  return {
    state: "signed-in",
    account: toAccount(account),
    returning: account.created_at < since,
    setupDone: account.setup_done_at !== null,
  };
}

function expired(email: string | undefined): AuthStatusBody {
  return email === undefined ? { state: "expired" } : { state: "expired", email };
}
