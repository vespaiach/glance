import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { err, ok, type Result } from "@/domain/result";
import type { AccountSettings, CalendarEvent, Tag } from "@/domain/schemas";
import type { PushMessage, PushSender, PushTarget } from "../push";
import { deleteEvent, putEvent } from "../services/events";
import { commitImport } from "../services/imports/commit";
import { stageImport } from "../services/imports/stage";
import { subscribePush } from "../services/push";
import { putSettings } from "../services/settings";
import { putTag } from "../services/tags";
import { MARIA, OMAR, serviceHarnessPerTest } from "../services/testServices";
import { cleanupReminderSends, sendReminderPushes } from "./reminders";

const harness = serviceHarnessPerTest();

const MINUTE = 60_000;

const HOUR = 60 * MINUTE;

const DAY = 24 * HOUR;

const WEEK = 7 * DAY;

const MOM: Tag = {
  id: "0192f3a0-3333-7000-8000-000000000001",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

type Sent = { endpoint: string; message: PushMessage };

let sent: Sent[];

let answers: Map<string, Result<void, "gone" | "failed">>;

const push: PushSender = async (target: PushTarget, message: PushMessage) => {
  sent.push({ endpoint: target.endpoint, message });

  return answers.get(target.endpoint) ?? ok(undefined);
};

function event(n: number, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: `0192f3a0-1111-7000-8000-00000000000${n}`,
    title: `Event ${n}`,
    startAt: "2026-10-09T14:15:00.000Z",
    everyone: true,
    tagIds: [],
    notify: true,
    ...overrides,
  };
}

async function addEvents(accountId: string, events: CalendarEvent[]): Promise<void> {
  for (const saved of events) await putEvent(harness.deps(), accountId, saved);
}

async function subscribe(accountId: string, displayId: string): Promise<void> {
  await harness.deps().db.displays.insert({
    id: displayId,
    accountId,
    kind: "smartphone",
    browser: "Safari",
    lastSeenAt: "2026-10-09T14:00:00.000Z",
  });

  await subscribePush(harness.deps(), accountId, displayId, {
    endpoint: `https://push.example.com/${displayId}`,
    keys: { p256dh: "p", auth: "a" },
  });
}

async function setLead(accountId: string, notifyLead: AccountSettings["notifyLead"]) {
  await putSettings(harness.deps(), accountId, accountId, { ...DEFAULT_SETTINGS, notifyLead });
}

async function run(): Promise<void> {
  await sendReminderPushes({ ...harness.deps(), push });
}

function messages(): PushMessage[] {
  return sent.map(({ message }) => message);
}

beforeEach(async () => {
  sent = [];
  answers = new Map();
  await subscribe(MARIA, "maria-phone");
});

describe("sendReminderPushes", () => {
  it("NOTIF-07 pushes a 15-min reminder with the start, who and place, opening Event details", async () => {
    await putTag(harness.deps(), MARIA, MOM);
    await addEvents(MARIA, [
      event(1, {
        title: "Swim practice",
        everyone: false,
        tagIds: [MOM.id],
        location: "Rec center",
      }),
    ]);

    await run();

    expect(sent).toEqual([
      {
        endpoint: "https://push.example.com/maria-phone",
        message: {
          title: "Swim practice in 15 min",
          body: "10:15 AM · Mom · Rec center",
          data: { url: `/today?event=${event(1).id}` },
        },
      },
    ]);
  });

  it("NOTIF-07 pushes a 30-min reminder with the account's 30 min lead and leaves out empty parts", async () => {
    await setLead(MARIA, 30);
    await addEvents(MARIA, [
      event(1, { title: "Dentist", startAt: "2026-10-09T14:30:00.000Z" }),
      event(2),
    ]);

    await run();

    expect(messages()).toEqual([
      expect.objectContaining({ title: "Dentist in 30 min", body: "10:30 AM · Everyone" }),
    ]);
  });

  it("NOTIF-01 pushes nothing at the start", async () => {
    await addEvents(MARIA, [event(1, { startAt: "2026-10-09T14:00:00.000Z" })]);

    await run();

    expect(sent).toEqual([]);
  });

  it("NOTIF-08 pushes nothing for an account whose lead time is off, and still for others", async () => {
    await subscribe(OMAR, "omar-phone");
    await setLead(MARIA, "off");
    await addEvents(MARIA, [event(1)]);
    await addEvents(OMAR, [event(2)]);

    await run();

    expect(sent.map(({ endpoint }) => endpoint)).toEqual(["https://push.example.com/omar-phone"]);
  });

  it("NOTIF-07 pushes each reminder once", async () => {
    await addEvents(MARIA, [event(1)]);

    await run();
    await run();
    harness.advance(30_000);
    await run();

    expect(sent).toHaveLength(1);
  });

  it("NOTIF-04 groups reminders due in the same minute, opening Today at that time", async () => {
    await addEvents(MARIA, [
      event(1, { title: "Swim" }),
      event(2, { title: "Piano" }),
      event(3, { title: "Soccer" }),
    ]);

    await run();

    expect(messages()).toEqual([
      {
        title: "3 events in 15 min",
        body: "10:15 AM · Swim, Piano, Soccer",
        data: { url: "/today?at=10:15" },
      },
    ]);
  });

  it("NOTIF-04 names the first two of a group over three and counts the rest", async () => {
    await addEvents(
      MARIA,
      [1, 2, 3, 4].map((n) => event(n)),
    );

    await run();

    expect(messages()).toEqual([
      expect.objectContaining({
        title: "4 events in 15 min",
        body: "10:15 AM · Event 1, Event 2, +2 more",
      }),
    ]);
  });

  it("NOTIF-09 skips events with the notification off, all-day events and deleted events", async () => {
    await addEvents(MARIA, [
      event(1, { notify: false }),
      event(2, { allDay: true, startAt: "2026-10-09T14:15:00.000Z" }),
      event(3),
    ]);
    await deleteEvent(harness.deps(), MARIA, event(3).id);

    await run();

    expect(sent).toEqual([]);
  });

  it("NOTIF-01 an imported event reminds at its lead time", async () => {
    const file = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Glance//Test//EN",
      "BEGIN:VEVENT",
      "UID:piano",
      "DTSTAMP:20260901T000000Z",
      "DTSTART:20261009T141500Z",
      "DTEND:20261009T151500Z",
      "SUMMARY:Piano",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const review = await stageImport(harness.deps(), MARIA, "maria-phone", {
      fileName: "piano.ics",
      text: file,
      size: file.length,
    });
    if (!review.ok) throw new Error(review.error);
    await commitImport(harness.deps(), MARIA, review.value.id, "everyone");

    await run();

    expect(messages()).toEqual([expect.objectContaining({ title: "Piano in 15 min" })]);
  });

  it("NOTIF-01 a weekly event reminds every week at its lead time", async () => {
    await addEvents(MARIA, [event(1, { title: "Swim", repeat: "weekly" })]);

    await run();
    harness.advance(WEEK);
    await run();
    harness.advance(WEEK);
    await run();

    expect(messages()).toEqual([
      expect.objectContaining({ title: "Swim in 15 min", body: "10:15 AM · Everyone" }),
      expect.objectContaining({ title: "Swim in 15 min", body: "10:15 AM · Everyone" }),
      expect.objectContaining({ title: "Swim in 15 min", body: "10:15 AM · Everyone" }),
    ]);
  });

  it("NOTIF-01 a weekly event doesn't remind in an excepted week", async () => {
    await addEvents(MARIA, [
      event(1, { title: "Swim", repeat: "weekly", exdates: ["2026-10-16"] }),
    ]);

    await run();
    harness.advance(WEEK);
    await run();
    harness.advance(WEEK);
    await run();

    expect(messages()).toEqual([
      expect.objectContaining({ title: "Swim in 15 min" }),
      expect.objectContaining({ title: "Swim in 15 min" }),
    ]);
  });

  it("NOTIF-01 a weekly event keeps its local time across DST", async () => {
    await addEvents(MARIA, [
      event(1, { title: "Swim", startAt: "2026-10-30T14:15:00.000Z", repeat: "weekly" }),
    ]);

    harness.advance(28 * DAY + HOUR);
    await run();

    expect(messages()).toEqual([
      expect.objectContaining({ title: "Swim in 15 min", body: "10:15 AM · Everyone" }),
    ]);
  });

  it("NOTIF-01 a weekly event never reminds before its first day", async () => {
    await addEvents(MARIA, [event(1, { startAt: "2026-10-16T14:15:00.000Z", repeat: "weekly" })]);

    await run();

    expect(sent).toEqual([]);
  });

  it("NOTIF-09 a weekly event with the notification off is silent every week", async () => {
    await addEvents(MARIA, [
      event(1, { startAt: "2026-10-02T14:15:00.000Z", repeat: "weekly", notify: false }),
    ]);

    await run();
    harness.advance(WEEK);
    await run();

    expect(sent).toEqual([]);
  });

  it("D30 doesn't push a reminder late", async () => {
    await addEvents(MARIA, [event(1, { startAt: "2026-10-09T14:10:00.000Z" })]);

    await run();

    expect(sent).toEqual([]);
  });

  it("NOTIF-07 pushes to every subscription of the event's account and none of another", async () => {
    await subscribe(MARIA, "maria-tablet");
    await subscribe(OMAR, "omar-phone");
    await addEvents(MARIA, [event(1)]);

    await run();

    expect(sent.map(({ endpoint }) => endpoint).sort()).toEqual([
      "https://push.example.com/maria-phone",
      "https://push.example.com/maria-tablet",
    ]);
  });

  it("D30 deletes a subscription the push service says is gone and keeps one that failed", async () => {
    await subscribe(MARIA, "maria-tablet");
    answers.set("https://push.example.com/maria-phone", err("gone"));
    answers.set("https://push.example.com/maria-tablet", err("failed"));
    await addEvents(MARIA, [event(1)]);

    await run();

    const left = await harness.deps().db.pushSubscriptions.forAccount(MARIA);
    expect(left.map(({ endpoint }) => endpoint)).toEqual(["https://push.example.com/maria-tablet"]);
  });

  it("D30 records the send even when the account has no subscription", async () => {
    await addEvents(OMAR, [event(1)]);

    await run();
    await subscribe(OMAR, "omar-phone");
    await run();

    expect(sent).toEqual([]);
  });
});

describe("cleanupReminderSends", () => {
  it("D30 deletes sends older than a day", async () => {
    await addEvents(MARIA, [event(1), event(2, { startAt: "2026-10-10T14:15:00.000Z" })]);
    await run();
    harness.advance(24 * 60 * MINUTE);
    await run();
    harness.advance(MINUTE);

    await cleanupReminderSends(harness.deps());

    const again = await harness.deps().db.reminderSends.insert(
      [
        { eventId: event(1).id, kind: "15min", fireAt: "2026-10-09T14:00:00.000Z" },
        { eventId: event(2).id, kind: "15min", fireAt: "2026-10-10T14:00:00.000Z" },
      ],
      "2026-10-10T14:01:00.000Z",
    );
    expect(again.map(({ eventId }) => eventId)).toEqual([event(1).id]);
  });
});
