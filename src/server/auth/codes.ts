import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import type { AccountSettings, Season } from "@/domain/schemas";
import { seasonFor } from "@/domain/season";
import type { Db } from "../db/db";
import { signInMessage } from "../mail/mailer";
import { type AccountRow, accountByEmail } from "./account";
import type { AuthDeps } from "./deps";
import { openDisplay } from "./sessions";
import { type SessionSignIn, signedIn } from "./status";
import { hashCode, sameHash } from "./tokens";

const CODE_TTL_MS = 10 * 60 * 1000;

const MAX_TRIES = 5;

export type CodeError = "wrong-code" | "code-locked" | "code-expired";

export type CodeInput = { email: string; timeZone: string; ip: string };

export type VerifyCodeInput = { email: string; code: string; ip: string; userAgent?: string };

type CodeRow = {
  email: string;
  code_hash: string;
  time_zone: string;
  tries: number;
  expires_at: string;
};

type Checked = Result<CodeRow, CodeError>;

export async function requestCode(
  deps: AuthDeps,
  { email, timeZone, ip }: CodeInput,
): Promise<Result<void, "rate-limited" | "mail-failed">> {
  const address = normalizeEmail(email);

  if (!withinSendLimits(deps, address, ip)) return err("rate-limited");

  const code = deps.newCode();

  await storeCode(deps, { address, code, timeZone });

  const season = await emailSeason(deps, address, timeZone);

  return deps.mailer.send(signInMessage(address, code, season));
}

export async function verifyCode(
  deps: AuthDeps,
  { email, code, ip, userAgent }: VerifyCodeInput,
): Promise<Result<SessionSignIn, CodeError | "rate-limited">> {
  if (!deps.limits.verify.allow(ip, deps.now())) return err("rate-limited");

  const address = normalizeEmail(email);

  const at = deps.now().toISOString();

  return deps.db.tx(async (tx): Promise<Result<SessionSignIn, CodeError>> => {
    const checked = await checkCode(tx, address, code, at);

    if (!checked.ok) return checked;

    await tx.run("DELETE FROM sign_in_codes WHERE email = $1", [address]);

    const known = await accountByEmail(tx, address);

    const account = known ?? (await createAccount(tx, checked.value, at));

    const sessionToken = await openDisplay(tx, account.id, { at, userAgent });

    return ok({ status: signedIn(account, known !== undefined), sessionToken });
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function withinSendLimits({ limits, now }: AuthDeps, address: string, ip: string): boolean {
  const byEmail = limits.email.allow(address, now());

  const byIp = limits.ip.allow(ip, now());

  return byEmail && byIp;
}

async function storeCode(
  { db, now }: AuthDeps,
  { address, code, timeZone }: { address: string; code: string; timeZone: string },
): Promise<void> {
  const expiresAt = new Date(now().getTime() + CODE_TTL_MS).toISOString();

  await db.run(
    `INSERT INTO sign_in_codes (email, code_hash, time_zone, tries, expires_at) VALUES ($1, $2, $3, 0, $4)
     ON CONFLICT (email) DO UPDATE SET code_hash = $2, time_zone = $3, tries = 0, expires_at = $4`,
    [address, hashCode(address, code), timeZone, expiresAt],
  );
}

async function emailSeason(
  { db, now }: AuthDeps,
  address: string,
  timeZone: string,
): Promise<Season> {
  const row = await db.one<{ season: AccountSettings["season"] | null }>(
    "SELECT s.json ->> 'season' AS season FROM accounts a JOIN settings s ON s.account_id = a.id WHERE a.email = $1",
    [address],
  );

  return seasonFor(row?.season ?? "auto", now(), timeZone);
}

async function checkCode(db: Db, address: string, code: string, at: string): Promise<Checked> {
  const row = await db.one<CodeRow>("SELECT * FROM sign_in_codes WHERE email = $1 FOR UPDATE", [
    address,
  ]);

  if (row === undefined || row.expires_at <= at) return err("code-expired");

  if (row.tries >= MAX_TRIES) return err("code-locked");

  if (sameHash(row.code_hash, hashCode(address, code))) return ok(row);

  return countWrongTry(db, row);
}

async function countWrongTry(db: Db, row: CodeRow): Promise<Checked> {
  await db.run("UPDATE sign_in_codes SET tries = tries + 1 WHERE email = $1", [row.email]);

  return err(row.tries + 1 >= MAX_TRIES ? "code-locked" : "wrong-code");
}

async function createAccount(db: Db, row: CodeRow, at: string): Promise<AccountRow> {
  const account = {
    id: uuidv7(new Date(at)),
    email: row.email,
    name: null,
    time_zone: row.time_zone,
    setup_done_at: null,
    created_at: at,
  };

  await db.run(
    "INSERT INTO accounts (id, email, name, time_zone, created_at) VALUES ($1, $2, $3, $4, $5)",
    [account.id, account.email, account.name, account.time_zone, account.created_at],
  );

  return account;
}
