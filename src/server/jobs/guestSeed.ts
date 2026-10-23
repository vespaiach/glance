import "server-only";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { uuidv7 } from "@/domain/id";
import type { AccountSettings } from "@/domain/schemas";
import type { AccountRecord } from "../db";
import type { ServiceDeps } from "../services/deps";
import { putEvent } from "../services/events";
import { putNote } from "../services/notes";
import { putSettings } from "../services/settings";
import { putTag } from "../services/tags";
import { GUEST_NAME, GUEST_PLACE, GUEST_TIME_ZONE, guestFamily } from "./guestFamily";

const GUEST_SETTINGS: AccountSettings = {
  ...DEFAULT_SETTINGS,
  weatherLocation: GUEST_PLACE,
  noteExpiry: { ...DEFAULT_SETTINGS.noteExpiry, on: false },
};

export async function seedGuest(
  { db, now }: ServiceDeps,
  email: string | undefined,
): Promise<void> {
  if (email === undefined) return;

  await db.tx(async (tx) => {
    if (await tx.accounts.byEmail(email)) return;

    const account = guestAccount(email, now());

    await tx.accounts.insert(account);

    await saveFamily({ db: tx, now }, account.id);
  });
}

function guestAccount(email: string, at: Date): AccountRecord {
  return {
    id: uuidv7(at),
    email,
    name: GUEST_NAME,
    timeZone: GUEST_TIME_ZONE,
    setupDoneAt: at.toISOString(),
    createdAt: at.toISOString(),
  };
}

async function saveFamily(deps: ServiceDeps, accountId: string): Promise<void> {
  const { tags, events, notes } = guestFamily(deps.now());

  await putSettings(deps, accountId, accountId, GUEST_SETTINGS);

  for (const tag of tags) await putTag(deps, accountId, tag);

  for (const event of events) await putEvent(deps, accountId, event);

  for (const note of notes) await putNote(deps, accountId, note);
}
