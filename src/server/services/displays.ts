import "server-only";
import type { Browser, DeviceKind, SignedInScreen } from "@/domain/screens";
import type { ServiceDeps } from "./deps";

type DisplayRow = {
  id: string;
  kind: DeviceKind;
  browser: Browser | null;
  last_seen_at: string;
};

export async function listDisplays(
  { db }: ServiceDeps,
  accountId: string,
  displayId: string,
): Promise<SignedInScreen[]> {
  const rows = await db.all<DisplayRow>(
    "SELECT id, kind, browser, last_seen_at FROM displays WHERE account_id = $1 ORDER BY id = $2 DESC, last_seen_at DESC NULLS LAST, id",
    [accountId, displayId],
  );

  return rows.map((row) => toScreen(row, displayId));
}

function toScreen(row: DisplayRow, displayId: string): SignedInScreen {
  return {
    id: row.id,
    kind: row.kind,
    browser: row.browser,
    lastSeenAt: row.last_seen_at,
    current: row.id === displayId,
  };
}
