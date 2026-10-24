import "server-only";
import type { PushSubscriptionRecord, ReminderSendRecord, Repos } from "../database";
import type { Sql } from "./sql";

type SubscriptionRow = {
  id: string;
  account_id: string;
  display_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

type SendRow = { event_id: string; kind: ReminderSendRecord["kind"]; fire_at: string };

export function pushSubscriptionsRepo(sql: Sql): Repos["pushSubscriptions"] {
  return {
    save: (subscription) => saveSubscription(sql, subscription),
    forAccount: async (accountId) => {
      const rows = await sql.all<SubscriptionRow>(
        "SELECT * FROM push_subscriptions WHERE account_id = $1 ORDER BY id",
        [accountId],
      );

      return rows.map(toSubscription);
    },
    removeForDisplay: async (accountId, displayId) => {
      await sql.run("DELETE FROM push_subscriptions WHERE account_id = $1 AND display_id = $2", [
        accountId,
        displayId,
      ]);
    },
    removeEndpoint: async (endpoint) => {
      await sql.run("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    },
  };
}

export function reminderSendsRepo(sql: Sql): Repos["reminderSends"] {
  return {
    insert: async (sends, sentAt) => {
      const rows = await sql.all<SendRow>(
        `INSERT INTO reminder_sends (event_id, kind, fire_at, sent_at)
         SELECT event_id, kind, fire_at, $4 FROM unnest($1::text[], $2::text[], $3::timestamptz[])
           AS sends (event_id, kind, fire_at)
         ON CONFLICT DO NOTHING
         RETURNING event_id, kind, fire_at`,
        [
          sends.map((send) => send.eventId),
          sends.map((send) => send.kind),
          sends.map((send) => send.fireAt),
          sentAt,
        ],
      );

      return rows.map((row) => ({ eventId: row.event_id, kind: row.kind, fireAt: row.fire_at }));
    },
    removeSentBefore: async (at) => {
      await sql.run("DELETE FROM reminder_sends WHERE sent_at < $1", [at]);
    },
  };
}

async function saveSubscription(sql: Sql, subscription: PushSubscriptionRecord): Promise<void> {
  await sql.run("DELETE FROM push_subscriptions WHERE display_id = $1 AND endpoint <> $2", [
    subscription.displayId,
    subscription.endpoint,
  ]);

  await sql.run(
    `INSERT INTO push_subscriptions (id, account_id, display_id, endpoint, p256dh, auth, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (endpoint) DO UPDATE SET account_id = excluded.account_id,
       display_id = excluded.display_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [
      subscription.id,
      subscription.accountId,
      subscription.displayId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      subscription.createdAt,
    ],
  );
}

function toSubscription(row: SubscriptionRow): PushSubscriptionRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    displayId: row.display_id,
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
    createdAt: row.created_at,
  };
}
