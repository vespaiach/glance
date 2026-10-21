import "server-only";
import type { SignedInScreen } from "@/domain/screens";
import type { DisplayRecord } from "../db";
import type { ServiceDeps } from "./deps";

export async function listDisplays(
  { db }: ServiceDeps,
  accountId: string,
  displayId: string,
): Promise<SignedInScreen[]> {
  const displays = await db.displays.forAccount(accountId);

  return displays.sort(currentThenRecent(displayId)).map((display) => toScreen(display, displayId));
}

function currentThenRecent(displayId: string) {
  return (a: DisplayRecord, b: DisplayRecord): number =>
    Number(b.id === displayId) - Number(a.id === displayId) ||
    newerFirst(a.lastSeenAt, b.lastSeenAt) ||
    (a.id < b.id ? -1 : 1);
}

function newerFirst(a: string, b: string): number {
  if (a === b) return 0;

  return a < b ? 1 : -1;
}

function toScreen(display: DisplayRecord, displayId: string): SignedInScreen {
  return {
    id: display.id,
    kind: display.kind,
    browser: display.browser,
    lastSeenAt: display.lastSeenAt,
    current: display.id === displayId,
  };
}
