import "server-only";
import { copy } from "@/copy";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import {
  type ReminderGroup,
  type ReminderKind,
  reminderKey,
  remindersDue,
} from "@/domain/reminders";
import type { Tag } from "@/domain/schemas";
import { whoLabel } from "@/domain/tags";
import { type Clock, clockAt } from "@/domain/time";
import type { Database, Owned, ReminderSendRecord, StoredEvent } from "../db";
import type { PushMessage, PushSender } from "../push";
import type { ServiceDeps } from "../services/deps";
import { accountTimeZone } from "../services/rows";

export type ReminderJobDeps = ServiceDeps & { push: PushSender };

type Wording = { tags: Tag[]; clock: Clock; tz: string };

const MINUTE = 60_000;

const LEAD = 15 * MINUTE;

const KEEP_SENDS_MS = 24 * 60 * MINUTE;

const strip = copy.reminder.strip;

const words = copy.reminder.push;

export async function sendReminderPushes(deps: ReminderJobDeps): Promise<void> {
  const at = deps.now();

  const events = await eventsFiringNow(deps.db, at);

  for (const [accountId, owned] of byAccount(events)) {
    await sendAccountReminders(deps, accountId, owned, at);
  }
}

export async function cleanupReminderSends({ db, now }: ServiceDeps): Promise<void> {
  await db.reminderSends.removeSentBefore(new Date(now().getTime() - KEEP_SENDS_MS).toISOString());
}

async function eventsFiringNow(db: Database, at: Date): Promise<Owned<StoredEvent>[]> {
  const starting = await db.events.liveStarting(isoAt(at, -MINUTE), isoAt(at, 0));

  const soon = await db.events.liveStarting(isoAt(at, LEAD - MINUTE), isoAt(at, LEAD));

  return [...starting, ...soon];
}

async function sendAccountReminders(
  { db, push }: ReminderJobDeps,
  accountId: string,
  events: StoredEvent[],
  at: Date,
): Promise<void> {
  const due = remindersDue(events, at, new Set());

  const fresh = await db.reminderSends.insert(due.flatMap(sendsOf), at.toISOString());

  const groups = remindersDue(events, at, alreadySent(due, fresh));

  if (groups.length === 0) return;

  const wording = await accountWording(db, accountId);

  const messages = groups.map((group) => pushMessage(group, wording));

  for (const target of await db.pushSubscriptions.forAccount(accountId)) {
    for (const message of messages) {
      const sent = await push(target, message);

      if (!sent.ok && sent.error === "gone") {
        await db.pushSubscriptions.removeEndpoint(target.endpoint);
        break;
      }
    }
  }
}

async function accountWording(db: Database, accountId: string): Promise<Wording> {
  const tags = await db.tags.changedSince(accountId, 0);

  const settings = await db.settings.get(accountId);

  return {
    tags: tags.filter((tag) => tag.deletedAt === undefined),
    clock: settings?.clock ?? DEFAULT_SETTINGS.clock,
    tz: await accountTimeZone(db, accountId),
  };
}

function pushMessage(group: ReminderGroup<StoredEvent>, { tags, clock, tz }: Wording): PushMessage {
  const start = clockAt(group.startAt, clock, tz);

  const title = group.kind === "start" ? words.now : words.soon;

  const [only, ...others] = group.events;

  if (only && others.length === 0) {
    return {
      title: title(only.title),
      body: strip.eyebrow([start, whoLabel(only, tags, copy.events.everyone), only.location]),
      data: { url: `/today?event=${only.id}` },
    };
  }

  return {
    title: title(strip.count(group.events.length)),
    body: strip.eyebrow([start, strip.titles(group.titles, group.more)]),
    data: { url: `/today?at=${clockAt(group.startAt, "24h", tz)}` },
  };
}

function byAccount(events: Owned<StoredEvent>[]): Map<string, StoredEvent[]> {
  const accounts = new Map<string, StoredEvent[]>();

  for (const { accountId, value } of events) {
    accounts.set(accountId, [...(accounts.get(accountId) ?? []), value]);
  }

  return accounts;
}

function sendsOf(group: ReminderGroup): ReminderSendRecord[] {
  return group.keys.map((key) => {
    const [eventId = "", kind, fireAt] = key.split(":");

    return { eventId, kind: kind as ReminderKind, fireAt: new Date(Number(fireAt)).toISOString() };
  });
}

function alreadySent(due: ReminderGroup[], fresh: ReminderSendRecord[]): Set<string> {
  const sent = new Set(
    fresh.map((send) => reminderKey(send.eventId, send.kind, Date.parse(send.fireAt))),
  );

  return new Set(due.flatMap((group) => group.keys).filter((key) => !sent.has(key)));
}

function isoAt(at: Date, offsetMs: number): string {
  return new Date(at.getTime() + offsetMs).toISOString();
}
