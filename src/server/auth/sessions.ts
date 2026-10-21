import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import { deviceOf } from "@/domain/screens";
import type { Database } from "../db";
import type { Clocked } from "./deps";
import { hashToken, newToken } from "./tokens";

export type SignedInDisplay = { displayId: string; accountId: string };

export async function openDisplay(
  db: Database,
  accountId: string,
  opened: { at: string; userAgent: string | undefined },
): Promise<string> {
  const id = uuidv7(new Date(opened.at));

  const { kind, browser } = deviceOf(opened.userAgent);

  await db.displays.insert({ id, accountId, kind, browser, lastSeenAt: opened.at });

  return createSession(db, id, opened.at);
}

export async function findDisplay(
  db: Database,
  sessionToken: string | undefined,
): Promise<SignedInDisplay | undefined> {
  if (sessionToken === undefined) return undefined;

  const session = await db.sessions.find(hashToken(sessionToken));

  return session && { displayId: session.displayId, accountId: session.accountId };
}

export async function requireDisplay(
  { db, now }: Clocked,
  sessionToken: string | undefined,
): Promise<Result<SignedInDisplay, "unauthorized">> {
  const display = await findDisplay(db, sessionToken);

  if (display === undefined) return err("unauthorized");

  await db.displays.seen(display.displayId, now().toISOString());

  return ok(display);
}

export async function signOut(db: Database, sessionToken: string | undefined): Promise<void> {
  const display = await findDisplay(db, sessionToken);

  if (display === undefined) return;

  await db.tx(async (tx) => {
    await tx.sessions.removeForDisplay(display.displayId);
    await tx.displays.remove(display.displayId);
  });
}

async function createSession(db: Database, displayId: string, at: string): Promise<string> {
  const token = newToken();

  await db.sessions.insert({ tokenHash: hashToken(token), displayId, createdAt: at });

  return token;
}
