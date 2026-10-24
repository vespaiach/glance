import "server-only";
import type { Account } from "@/domain/schemas";
import type { AccountRecord } from "../db";
import { toAccount } from "./account";
import type { Clocked } from "./deps";
import { hashToken } from "./tokens";

type SignedInBody = {
  state: "signed-in";
  account: Account;
  returning: boolean;
  setupDone: boolean;
};

export type AuthStatusBody = SignedInBody | { state: "signed-out" };

export type SessionSignIn = { status: SignedInBody; sessionToken: string };

export async function authStatus(
  { db }: Clocked,
  sessionToken: string | undefined,
): Promise<AuthStatusBody> {
  if (sessionToken === undefined) return { state: "signed-out" };

  const session = await db.sessions.find(hashToken(sessionToken));

  const account = session && (await db.accounts.byId(session.accountId));

  if (!session || !account) return { state: "signed-out" };

  return signedIn(account, account.createdAt < session.createdAt);
}

export function signedIn(account: AccountRecord, returning: boolean): SignedInBody {
  return {
    state: "signed-in",
    account: toAccount(account),
    returning,
    setupDone: account.setupDoneAt !== null,
  };
}
