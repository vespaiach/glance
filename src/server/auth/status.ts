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

export type StatusInput = { sessionToken?: string; pendingId?: string; linkEmail?: string };

type SessionRow = AccountRow & { session_created_at: string };

export function authStatus(deps: Clocked, input: StatusInput): StatusAnswer {
  const session = sessionAccount(deps, input.sessionToken);

  if (session) return { status: signedIn(session, session.session_created_at) };

  const link =
    input.pendingId === undefined ? undefined : linkByPendingId(deps.db, input.pendingId);

  if (link) return linkStatus(deps, link);

  return { status: expired(input.linkEmail) };
}

function sessionAccount({ db }: Clocked, sessionToken: string | undefined): SessionRow | undefined {
  if (sessionToken === undefined) return undefined;

  return db
    .prepare(
      "SELECT a.*, s.created_at AS session_created_at FROM sessions s JOIN displays d ON d.id = s.display_id JOIN accounts a ON a.id = d.account_id WHERE s.token_hash = ?",
    )
    .get(hashToken(sessionToken)) as SessionRow | undefined;
}

function linkStatus(deps: Clocked, link: LinkRow): StatusAnswer {
  if (link.used_at === null) return { status: unopened(deps, link) };

  const account = accountByEmail(deps.db, link.email);

  if (account === undefined) return { status: expired(link.email) };

  if (account.name === null || account.setup_done_at === null) {
    return { status: { state: "finishing-elsewhere" } };
  }

  return claim(deps, link, account, link.used_at);
}

function unopened({ now }: Clocked, link: LinkRow): AuthStatusBody {
  return link.expires_at <= now().toISOString() ? expired(link.email) : { state: "waiting" };
}

function claim({ db }: Clocked, link: LinkRow, account: AccountRow, usedAt: string): StatusAnswer {
  const sessionToken = db.transaction(() => {
    deleteLink(db, link.token_hash);

    return openDisplay(db, account.id, usedAt);
  })();

  return { status: signedIn(account, usedAt), sessionToken };
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
