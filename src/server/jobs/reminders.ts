import "server-only";
import { copy } from "@/copy";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { type NotifyLead, type ReminderGroup, reminderKey, remindersDue } from "@/domain/reminders";
import type { AccountSettings, Tag } from "@/domain/schemas";
import { whoLabel } from "@/domain/tags";
import { type Clock, clockAt } from "@/domain/time";
import type { Database, Owned, ReminderSendRecord, StoredEvent } from "../db";
import type { PushMessage, PushSender } from "../push";
import type { ServiceDeps } from "../services/deps";
import { accountTimeZone } from "../services/rows";

export type ReminderJobDeps = ServiceDeps & { push: PushSender };

type Wording = { tags: Tag[]; clock: Clock; tz: string; lead: number };

type Lead = Exclude<NotifyLead, "off">;

const MINUTE = 60_000;

const LEADS: readonly Lead[] = [15, 30];

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
  const windows = LEADS.map((lead) =>
    db.events.liveStarting(isoAt(at, (lead - 1) * MINUTE), isoAt(at, lead * MINUTE)),
  );

  return (await Promise.all(windows)).flat();
}

async function sendAccountReminders(
  { db, push }: ReminderJobDeps,
  accountId: string,
  events: StoredEvent[],
  at: Date,
): Promise<void> {
  const settings = await db.settings.get(accountId);

  const lead = settings?.notifyLead ?? DEFAULT_SETTINGS.notifyLead;

  if (lead === "off") return;

  const firing = events.filter((event) => startsAtLead(event, lead, at));

  const due = remindersDue(firing, lead, at, new Set());

  const fresh = await db.reminderSends.insert(
    due.flatMap((group) => sendsOf(group, lead)),
    at.toISOString(),
  );

  const groups = remindersDue(firing, lead, at, alreadySent(due, fresh));

  if (groups.length === 0) return;

  const wording = await accountWording(db, accountId, settings, lead);

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

async function accountWording(
  db: Database,
  accountId: string,
  settings: AccountSettings | undefined,
  lead: Lead,
): Promise<Wording> {
  const tags = await db.tags.changedSince(accountId, 0);

  return {
    tags: tags.filter((tag) => tag.deletedAt === undefined),
    clock: settings?.clock ?? DEFAULT_SETTINGS.clock,
    tz: await accountTimeZone(db, accountId),
    lead,
  };
}

function pushMessage(
  group: ReminderGroup<StoredEvent>,
  { tags, clock, tz, lead }: Wording,
): PushMessage {
  const start = clockAt(group.startAt, clock, tz);

  const title = (what: string) => words.soon(what, lead);

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

function sendsOf(group: ReminderGroup, lead: Lead): ReminderSendRecord[] {
  return group.keys.map((key) => {
    const [eventId = "", fireAt] = key.split(":");

    return { eventId, kind: `${lead}min`, fireAt: new Date(Number(fireAt)).toISOString() };
  });
}

function alreadySent(due: ReminderGroup[], fresh: ReminderSendRecord[]): Set<string> {
  const sent = new Set(fresh.map((send) => reminderKey(send.eventId, Date.parse(send.fireAt))));

  return new Set(due.flatMap((group) => group.keys).filter((key) => !sent.has(key)));
}

function startsAtLead({ startAt }: StoredEvent, lead: Lead, at: Date): boolean {
  const ahead = Date.parse(startAt) - at.getTime();

  return ahead > (lead - 1) * MINUTE && ahead <= lead * MINUTE;
}

function isoAt(at: Date, offsetMs: number): string {
  return new Date(at.getTime() + offsetMs).toISOString();
}
