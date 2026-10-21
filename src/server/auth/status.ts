import "server-only";
import type { Account } from "@/domain/schemas";
import { type AccountRow, toAccount } from "./account";
import type { Clocked } from "./deps";
import { hashToken } from "./tokens";

export type SignedInBody = {
  state: "signed-in";
  account: Account;
  returning: boolean;
  setupDone: boolean;
};

export type AuthStatusBody = SignedInBody | { state: "signed-out" };

export type SessionSignIn = { status: SignedInBody; sessionToken: string };

type SessionRow = AccountRow & { session_created_at: string };

export async function authStatus(
  { db }: Clocked,
  sessionToken: string | undefined,
): Promise<AuthStatusBody> {
  if (sessionToken === undefined) return { state: "signed-out" };

  const row = await db.one<SessionRow>(
    "SELECT a.*, s.created_at AS session_created_at FROM sessions s JOIN displays d ON d.id = s.display_id JOIN accounts a ON a.id = d.account_id WHERE s.token_hash = $1",
    [hashToken(sessionToken)],
  );

  return row ? signedIn(row, row.created_at < row.session_created_at) : { state: "signed-out" };
}

export function signedIn(account: AccountRow, returning: boolean): SignedInBody {
  return {
    state: "signed-in",
    account: toAccount(account),
    returning,
    setupDone: account.setup_done_at !== null,
  };
}
