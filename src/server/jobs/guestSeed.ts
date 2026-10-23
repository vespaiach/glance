import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { uuidv7 } from "@/domain/id";
import type { AccountSettings } from "@/domain/schemas";
import type { AccountRecord } from "../db";
import type { ServiceDeps } from "../services/deps";
import { putEvent } from "../services/events";
import { putNote } from "../services/notes";
import { type PhotoDeps, type PhotoUpload, uploadPhoto } from "../services/photos";
import { putSettings } from "../services/settings";
import { putTag } from "../services/tags";
import { GUEST_NAME, GUEST_PLACE, GUEST_TIME_ZONE, guestFamily } from "./guestFamily";

export type GuestSeedDeps = PhotoDeps & { photoDir: string };

export const GUEST_PHOTO_DIR = path.join(process.cwd(), "assets", "guest-photos");

const GUEST_SETTINGS: AccountSettings = {
  ...DEFAULT_SETTINGS,
  weatherLocation: GUEST_PLACE,
  noteExpiry: { ...DEFAULT_SETTINGS.noteExpiry, on: false },
};

const JPEG = /\.jpe?g$/i;

export async function seedGuest(deps: GuestSeedDeps, email: string | undefined): Promise<void> {
  if (email === undefined) return;

  await deps.db.tx(async (tx) => {
    if (await tx.accounts.byEmail(email)) return;

    const account = guestAccount(email, deps.now());

    await tx.accounts.insert(account);

    await saveFamily({ ...deps, db: tx }, account.id);

    await savePhotos({ ...deps, db: tx }, account.id);
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

async function savePhotos(deps: GuestSeedDeps, accountId: string): Promise<void> {
  for (const name of photoNames(deps.photoDir)) {
    await uploadPhoto(deps, accountId, photoUpload(deps.photoDir, name));
  }
}

function photoNames(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => JPEG.test(name))
    .sort();
}

function photoUpload(dir: string, name: string): PhotoUpload {
  const bytes = readFileSync(path.join(dir, name));

  return { name, type: "image/jpeg", size: bytes.length, body: Readable.from([bytes]) };
}
