import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import type { Db } from "../db/db";
import { signInMessage } from "../mail/mailer";
import { type AccountRow, accountByEmail } from "./account";
import type { AuthDeps, Clocked } from "./deps";
import { openDisplay } from "./sessions";
import { hashToken, newToken } from "./tokens";

const LINK_TTL_MS = 10 * 60 * 1000;

export type LinkRow = {
  token_hash: string;
  email: string;
  pending_id: string;
  time_zone: string;
  expires_at: string;
  used_at: string | null;
};

export type LinkInput = { email: string; timeZone: string; ip: string };

export type Verified = { sessionToken: string; claimedPending: boolean };

export type StaleLink = { code: "stale"; email: string | null };

export async function requestLink(
  deps: AuthDeps,
  { email, timeZone, ip }: LinkInput,
): Promise<Result<{ pendingId: string }, "rate-limited" | "mail-failed">> {
  const address = normalizeEmail(email);

  if (!withinLimits(deps, address, ip)) return err("rate-limited");

  const token = newToken();

  const pendingId = newToken();

  await storeLink(deps, { address, token, pendingId, timeZone });

  const sent = await deps.mailer.send(signInMessage(address, verifyUrl(deps.appUrl, token)));

  return sent.ok ? ok({ pendingId }) : sent;
}

export async function verifyLink(
  { db, now }: Clocked,
  { token, pendingId }: { token: string; pendingId?: string },
): Promise<Result<Verified, StaleLink>> {
  const link = await linkByToken(db, token);

  const at = now().toISOString();

  if (link === undefined || link.used_at !== null || link.expires_at <= at) {
    return err({ code: "stale", email: link?.email ?? null });
  }

  const claimedPending = link.pending_id === pendingId;

  const sessionToken = await db.tx(async (tx) => {
    await tx.run("UPDATE magic_links SET used_at = $1 WHERE token_hash = $2", [
      at,
      link.token_hash,
    ]);

    const account = (await accountByEmail(tx, link.email)) ?? (await createAccount(tx, link, at));

    if (claimedPending) await deleteLink(tx, link.token_hash);

    return openDisplay(tx, account.id, at);
  });

  return ok({ sessionToken, claimedPending });
}

export function linkByPendingId(db: Db, pendingId: string): Promise<LinkRow | undefined> {
  return db.one<LinkRow>("SELECT * FROM magic_links WHERE pending_id = $1", [pendingId]);
}

export async function deleteLink(db: Db, tokenHash: string): Promise<void> {
  await db.run("DELETE FROM magic_links WHERE token_hash = $1", [tokenHash]);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function withinLimits({ limits, now }: AuthDeps, address: string, ip: string): boolean {
  const byEmail = limits.email.allow(address, now());

  const byIp = limits.ip.allow(ip, now());

  return byEmail && byIp;
}

async function storeLink(
  { db, now }: AuthDeps,
  link: { address: string; token: string; pendingId: string; timeZone: string },
): Promise<void> {
  const expiresAt = new Date(now().getTime() + LINK_TTL_MS).toISOString();

  await db.tx(async (tx) => {
    await tx.run("DELETE FROM magic_links WHERE email = $1 AND used_at IS NULL", [link.address]);
    await tx.run(
      "INSERT INTO magic_links (token_hash, email, pending_id, time_zone, expires_at) VALUES ($1, $2, $3, $4, $5)",
      [hashToken(link.token), link.address, link.pendingId, link.timeZone, expiresAt],
    );
  });
}

function verifyUrl(appUrl: string, token: string): string {
  const url = new URL("/api/auth/verify", appUrl);

  url.searchParams.set("t", token);

  return url.toString();
}

function linkByToken(db: Db, token: string): Promise<LinkRow | undefined> {
  return db.one<LinkRow>("SELECT * FROM magic_links WHERE token_hash = $1", [hashToken(token)]);
}

async function createAccount(db: Db, link: LinkRow, at: string): Promise<AccountRow> {
  const account = {
    id: uuidv7(new Date(at)),
    email: link.email,
    name: null,
    time_zone: link.time_zone,
    setup_done_at: null,
    created_at: at,
  };

  await db.run(
    "INSERT INTO accounts (id, email, name, time_zone, created_at) VALUES ($1, $2, $3, $4, $5)",
    [account.id, account.email, account.name, account.time_zone, account.created_at],
  );

  return account;
}
