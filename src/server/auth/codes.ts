import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import type { Season } from "@/domain/schemas";
import { seasonFor } from "@/domain/season";
import type { AccountRecord, Database, SignInCodeRecord } from "../db";
import { signInMessage } from "../mail/mailer";
import type { AuthDeps } from "./deps";
import { openDisplay } from "./sessions";
import { type SessionSignIn, signedIn } from "./status";
import { hashCode, sameHash } from "./tokens";

const CODE_TTL_MS = 10 * 60 * 1000;

const MAX_TRIES = 5;

export type CodeError = "wrong-code" | "code-locked" | "code-expired";

export type CodeInput = { email: string; timeZone: string; ip: string };

export type VerifyCodeInput = { email: string; code: string; ip: string; userAgent?: string };

type Checked = Result<SignInCodeRecord, CodeError>;

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

    await tx.signInCodes.remove(address);

    const known = await tx.accounts.byEmail(address);

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

  await db.signInCodes.put({
    email: address,
    codeHash: hashCode(address, code),
    timeZone,
    tries: 0,
    expiresAt,
  });
}

async function emailSeason(
  { db, now }: AuthDeps,
  address: string,
  timeZone: string,
): Promise<Season> {
  const account = await db.accounts.byEmail(address);

  const settings = account && (await db.settings.get(account.id));

  return seasonFor(settings?.season ?? "auto", now(), timeZone);
}

async function checkCode(
  db: Database,
  address: string,
  code: string,
  at: string,
): Promise<Checked> {
  const row = await db.signInCodes.get(address);

  if (row === undefined || row.expiresAt <= at) return err("code-expired");

  if (row.tries >= MAX_TRIES) return err("code-locked");

  if (sameHash(row.codeHash, hashCode(address, code))) return ok(row);

  return countWrongTry(db, row);
}

async function countWrongTry(db: Database, row: SignInCodeRecord): Promise<Checked> {
  await db.signInCodes.put({ ...row, tries: row.tries + 1 });

  return err(row.tries + 1 >= MAX_TRIES ? "code-locked" : "wrong-code");
}

async function createAccount(
  db: Database,
  row: SignInCodeRecord,
  at: string,
): Promise<AccountRecord> {
  const account = {
    id: uuidv7(new Date(at)),
    email: row.email,
    name: null,
    timeZone: row.timeZone,
    setupDoneAt: null,
    createdAt: at,
  };

  await db.accounts.insert(account);

  return account;
}
