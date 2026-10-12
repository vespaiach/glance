import "server-only";
import type Database from "better-sqlite3";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
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

  storeLink(deps, { address, token, pendingId, timeZone });

  const sent = await deps.mailer.send(signInMessage(address, verifyUrl(deps.appUrl, token)));

  return sent.ok ? ok({ pendingId }) : sent;
}

export function verifyLink(
  { db, now }: Clocked,
  { token, pendingId }: { token: string; pendingId?: string },
): Result<Verified, StaleLink> {
  const link = linkByToken(db, token);

  const at = now().toISOString();

  if (link === undefined || link.used_at !== null || link.expires_at <= at) {
    return err({ code: "stale", email: link?.email ?? null });
  }

  const claimedPending = link.pending_id === pendingId;

  const sessionToken = db.transaction(() => {
    db.prepare("UPDATE magic_links SET used_at = ? WHERE token_hash = ?").run(at, link.token_hash);

    const account = accountByEmail(db, link.email) ?? createAccount(db, link, at);

    if (claimedPending) deleteLink(db, link.token_hash);

    return openDisplay(db, account.id, at);
  })();

  return ok({ sessionToken, claimedPending });
}

export function linkByPendingId(db: Database.Database, pendingId: string): LinkRow | undefined {
  return db.prepare("SELECT * FROM magic_links WHERE pending_id = ?").get(pendingId) as
    | LinkRow
    | undefined;
}

export function deleteLink(db: Database.Database, tokenHash: string): void {
  db.prepare("DELETE FROM magic_links WHERE token_hash = ?").run(tokenHash);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function withinLimits({ limits, now }: AuthDeps, address: string, ip: string): boolean {
  const byEmail = limits.email.allow(address, now());

  const byIp = limits.ip.allow(ip, now());

  return byEmail && byIp;
}

function storeLink(
  { db, now }: AuthDeps,
  link: { address: string; token: string; pendingId: string; timeZone: string },
): void {
  const expiresAt = new Date(now().getTime() + LINK_TTL_MS).toISOString();

  db.transaction(() => {
    db.prepare("DELETE FROM magic_links WHERE email = ? AND used_at IS NULL").run(link.address);
    db.prepare(
      "INSERT INTO magic_links (token_hash, email, pending_id, time_zone, expires_at) VALUES (?, ?, ?, ?, ?)",
    ).run(hashToken(link.token), link.address, link.pendingId, link.timeZone, expiresAt);
  })();
}

function verifyUrl(appUrl: string, token: string): string {
  const url = new URL("/api/auth/verify", appUrl);

  url.searchParams.set("t", token);

  return url.toString();
}

function linkByToken(db: Database.Database, token: string): LinkRow | undefined {
  return db.prepare("SELECT * FROM magic_links WHERE token_hash = ?").get(hashToken(token)) as
    | LinkRow
    | undefined;
}

function createAccount(db: Database.Database, link: LinkRow, at: string): AccountRow {
  const account = {
    id: uuidv7(new Date(at)),
    email: link.email,
    name: null,
    time_zone: link.time_zone,
    setup_done_at: null,
    created_at: at,
  };

  db.prepare(
    "INSERT INTO accounts (id, email, name, time_zone, created_at) VALUES (@id, @email, @name, @time_zone, @created_at)",
  ).run(account);

  return account;
}
