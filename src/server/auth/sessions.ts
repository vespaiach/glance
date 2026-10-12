import "server-only";
import type Database from "better-sqlite3";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import type { Clocked } from "./deps";
import { hashToken, newToken } from "./tokens";

export type SignedInDisplay = { displayId: string; accountId: string };

type DisplayRow = { display_id: string; account_id: string };

export function openDisplay(db: Database.Database, accountId: string, at: string): string {
  const displayId = uuidv7(new Date(at));

  db.prepare("INSERT INTO displays (id, account_id, last_seen_at) VALUES (?, ?, ?)").run(
    displayId,
    accountId,
    at,
  );

  return createSession(db, displayId, at);
}

export function findDisplay(
  db: Database.Database,
  sessionToken: string | undefined,
): SignedInDisplay | undefined {
  if (sessionToken === undefined) return undefined;

  const row = db
    .prepare(
      "SELECT s.display_id, d.account_id FROM sessions s JOIN displays d ON d.id = s.display_id WHERE s.token_hash = ?",
    )
    .get(hashToken(sessionToken)) as DisplayRow | undefined;

  return row && { displayId: row.display_id, accountId: row.account_id };
}

export function requireDisplay(
  { db, now }: Clocked,
  sessionToken: string | undefined,
): Result<SignedInDisplay, "unauthorized"> {
  const display = findDisplay(db, sessionToken);

  if (display === undefined) return err("unauthorized");

  db.prepare("UPDATE displays SET last_seen_at = ? WHERE id = ?").run(
    now().toISOString(),
    display.displayId,
  );

  return ok(display);
}

export function signOut(db: Database.Database, sessionToken: string | undefined): void {
  const display = findDisplay(db, sessionToken);

  if (display === undefined) return;

  db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE display_id = ?").run(display.displayId);
    db.prepare("DELETE FROM displays WHERE id = ?").run(display.displayId);
  })();
}

function createSession(db: Database.Database, displayId: string, at: string): string {
  const token = newToken();

  db.prepare("INSERT INTO sessions (token_hash, display_id, created_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    displayId,
    at,
  );

  return token;
}
