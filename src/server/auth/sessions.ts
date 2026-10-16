import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import type { Db } from "../db/db";
import type { Clocked } from "./deps";
import { hashToken, newToken } from "./tokens";

export type SignedInDisplay = { displayId: string; accountId: string };

type DisplayRow = { display_id: string; account_id: string };

export async function openDisplay(db: Db, accountId: string, at: string): Promise<string> {
  const displayId = uuidv7(new Date(at));

  await db.run("INSERT INTO displays (id, account_id, last_seen_at) VALUES ($1, $2, $3)", [
    displayId,
    accountId,
    at,
  ]);

  return createSession(db, displayId, at);
}

export async function findDisplay(
  db: Db,
  sessionToken: string | undefined,
): Promise<SignedInDisplay | undefined> {
  if (sessionToken === undefined) return undefined;

  const row = await db.one<DisplayRow>(
    "SELECT s.display_id, d.account_id FROM sessions s JOIN displays d ON d.id = s.display_id WHERE s.token_hash = $1",
    [hashToken(sessionToken)],
  );

  return row && { displayId: row.display_id, accountId: row.account_id };
}

export async function requireDisplay(
  { db, now }: Clocked,
  sessionToken: string | undefined,
): Promise<Result<SignedInDisplay, "unauthorized">> {
  const display = await findDisplay(db, sessionToken);

  if (display === undefined) return err("unauthorized");

  await db.run("UPDATE displays SET last_seen_at = $1 WHERE id = $2", [
    now().toISOString(),
    display.displayId,
  ]);

  return ok(display);
}

export async function signOut(db: Db, sessionToken: string | undefined): Promise<void> {
  const display = await findDisplay(db, sessionToken);

  if (display === undefined) return;

  await db.tx(async (tx) => {
    await tx.run("DELETE FROM sessions WHERE display_id = $1", [display.displayId]);
    await tx.run("DELETE FROM displays WHERE id = $1", [display.displayId]);
  });
}

async function createSession(db: Db, displayId: string, at: string): Promise<string> {
  const token = newToken();

  await db.run("INSERT INTO sessions (token_hash, display_id, created_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    displayId,
    at,
  ]);

  return token;
}
