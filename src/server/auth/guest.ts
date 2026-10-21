import "server-only";
import { err, ok, type Result } from "@/domain/result";
import { type AccountRow, accountByEmail } from "./account";
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

async function guestAccount({ db, guestEmail }: AuthDeps): Promise<AccountRow | undefined> {
  if (guestEmail === undefined) return undefined;

  const account = await accountByEmail(db, guestEmail);

  return account && isSetUp(account) ? account : undefined;
}

function isSetUp(account: AccountRow): boolean {
  return account.name !== null && account.setup_done_at !== null;
}

function signedInGuest(account: AccountRow): SignedInBody {
  return signedIn(account, true);
}
