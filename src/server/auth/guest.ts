import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { AccountRecord } from "../db";
import type { AuthDeps } from "./deps";
import { openDisplay } from "./sessions";
import { type SessionSignIn, type SignedInBody, signedIn } from "./status";

export type GuestInput = { ip: string; userAgent?: string };

export async function guestAvailable(deps: AuthDeps): Promise<boolean> {
  return (await guestAccount(deps)) !== undefined;
}

export async function signInAsGuest(
  deps: AuthDeps,
  { ip, userAgent }: GuestInput,
): Promise<Result<SessionSignIn, "not-found" | "rate-limited">> {
  if (!deps.limits.guest.allow(ip, deps.now())) return err("rate-limited");

  const account = await guestAccount(deps);

  if (account === undefined) return err("not-found");

  const sessionToken = await openDisplay(deps.db, account.id, {
    at: deps.now().toISOString(),
    userAgent,
  });

  return ok({ status: signedInGuest(account), sessionToken });
}

async function guestAccount({ db, guestEmail }: AuthDeps): Promise<AccountRecord | undefined> {
  if (guestEmail === undefined) return undefined;

  const account = await db.accounts.byEmail(guestEmail);

  return account && isSetUp(account) ? account : undefined;
}

function isSetUp(account: AccountRecord): boolean {
  return account.name !== null && account.setupDoneAt !== null;
}

function signedInGuest(account: AccountRecord): SignedInBody {
  return signedIn(account, true);
}
