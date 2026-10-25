import { ambientReminder, minutesLeft, reminderKey, remindersDue } from "./reminders";

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 9, h, m, s);
const ms = (h: number, m: number) => at(h, m).getTime();

const none = new Set<string>();

const shift = { id: "shift", title: "Volunteer shift", startAt: iso(11, 0), notify: true } as const;
const older = { id: "older", title: "Piano lesson", startAt: iso(11, 0) } as const;
const quiet = { id: "quiet", title: "Nap", startAt: iso(11, 0), notify: false } as const;
const fair = {
  id: "fair",
  title: "School fair",
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  notify: true,
} as const;

const at330 = (id: string, title: string, m = 30) =>
  ({ id, title, startAt: iso(15, m), notify: true }) as const;

describe("remindersDue", () => {
  it("NOTIF-01 fires 15 minutes before the start with a 15 min lead", () => {
    expect(remindersDue([shift], 15, at(10, 45), none)).toEqual([
      {
        fireAt: ms(10, 45),
        startAt: shift.startAt,
        events: [shift],
        keys: [`shift:${ms(10, 45)}`],
        titles: ["Volunteer shift"],
        more: 0,
      },
    ]);
  });

  it("NOTIF-01 fires 30 minutes before the start with a 30 min lead", () => {
    expect(remindersDue([shift], 30, at(10, 29, 59), none)).toEqual([]);

    expect(remindersDue([shift], 30, at(10, 30), none)).toMatchObject([{ fireAt: ms(10, 30) }]);

    expect(remindersDue([shift], 30, at(10, 45), none)).toMatchObject([{ fireAt: ms(10, 30) }]);
  });

  it("NOTIF-01 nothing fires at the start", () => {
    expect(remindersDue([shift], 15, at(11, 0), none)).toEqual([]);

    expect(remindersDue([shift], 30, at(11, 0), none)).toEqual([]);
  });

  it("NOTIF-09 an event with its notification off never fires", () => {
    expect(remindersDue([quiet], 15, at(10, 45), none)).toEqual([]);
  });

  it("NOTIF-09 an event stored without a notification fires", () => {
    expect(remindersDue([older], 15, at(10, 45), none)).toHaveLength(1);
  });

  it("NOTIF-08 with the lead time off nothing fires for any event", () => {
    expect(remindersDue([shift, older], "off", at(10, 45), none)).toEqual([]);

    expect(remindersDue([shift, older], "off", at(11, 0), none)).toEqual([]);
  });

  it("NOTIF-01 all-day events have no reminder", () => {
    expect(remindersDue([fair], 15, new Date("2026-10-08T23:45:00.000Z"), none)).toEqual([]);
  });

  it("NOTIF-01 nothing is due before the fire time", () => {
    expect(remindersDue([shift], 15, at(10, 44, 59), none)).toEqual([]);
  });

  it("NOTIF-02 a missed reminder shows before the start with the real time left", () => {
    const now = at(10, 54);

    const [group] = remindersDue([shift], 15, now, none);

    expect(group).toMatchObject({ fireAt: ms(10, 45) });

    expect(group && minutesLeft(group, now)).toBe(6);
  });

  it("NOTIF-02 a missed reminder is skipped once the event started", () => {
    expect(remindersDue([shift], 15, at(11, 5), none)).toEqual([]);
  });

  it("NOTIF-02 a reminder already seen is not due again", () => {
    const seen = new Set([reminderKey("shift", ms(10, 45))]);

    expect(remindersDue([shift], 15, at(10, 46), seen)).toEqual([]);
  });

  it("NOTIF-02 a moved event fires again at its new time", () => {
    const seen = new Set([reminderKey("shift", ms(10, 45))]);
    const moved = { ...shift, startAt: iso(11, 30) };

    expect(remindersDue([moved], 15, at(11, 15), seen)).toHaveLength(1);
  });

  it("NOTIF-02 a changed lead time fires again", () => {
    const seen = new Set([reminderKey("shift", ms(10, 30))]);

    expect(remindersDue([shift], 15, at(10, 45), seen)).toHaveLength(1);
  });

  it("NOTIF-04 reminders of the same minute merge into one group in start order", () => {
    const soccer = at330("soccer", "Soccer practice");
    const dentist = {
      ...at330("dentist", "Dentist"),
      startAt: new Date(2026, 9, 9, 15, 30, 30).toISOString(),
    };
    const lesson = at330("lesson", "Piano lesson");

    const groups = remindersDue([dentist, lesson, soccer], 15, at(15, 15, 30), none);

    expect(groups).toHaveLength(1);

    expect(groups[0]?.events.map((event) => event.id)).toEqual(["lesson", "soccer", "dentist"]);

    expect(groups[0]).toMatchObject({
      titles: ["Piano lesson", "Soccer practice", "Dentist"],
      more: 0,
    });
  });

  it("NOTIF-04 reminders of different minutes stay apart", () => {
    const early = { ...shift, id: "early", startAt: iso(10, 59) };

    const groups = remindersDue([shift, early], 15, at(10, 45), none);

    expect(groups.map((group) => group.events[0]?.id)).toEqual(["early", "shift"]);
  });

  it("NOTIF-04 over 3 events a group shows the first 2 titles and how many more", () => {
    const events = ["A", "B", "C", "D", "E"].map((title) => at330(title, title));

    const [group] = remindersDue(events, 15, at(15, 15), none);

    expect(group).toMatchObject({ titles: ["A", "B"], more: 3 });

    expect(group?.keys).toHaveLength(5);
  });
});

describe("ambientReminder", () => {
  const tz = "Asia/Kolkata";

  const dinner = { ...shift, id: "dinner", endAt: iso(12, 0) };

  it("NOTIF-06 takes the slot at the lead time and reads In until the start", () => {
    expect(ambientReminder([dinner], 15, at(10, 44, 59), tz)).toBeUndefined();
    expect(ambientReminder([dinner], 15, at(10, 45), tz)).toEqual({
      event: dinner,
      atStart: false,
    });
    expect(ambientReminder([dinner], 30, at(10, 30), tz)).toEqual({
      event: dinner,
      atStart: false,
    });
  });

  it("NOTIF-06 from the start it reads Now until the event ends", () => {
    expect(ambientReminder([dinner], 15, at(11, 0), tz)).toEqual({ event: dinner, atStart: true });
    expect(ambientReminder([dinner], 15, at(11, 59, 59), tz)).toEqual({
      event: dinner,
      atStart: true,
    });
    expect(ambientReminder([dinner], 15, at(12, 0), tz)).toBeUndefined();
  });

  it("NOTIF-06 an event with no end keeps the slot until its day ends", () => {
    expect(ambientReminder([shift], 15, at(23, 59), tz)).toEqual({ event: shift, atStart: true });
    expect(ambientReminder([shift], 15, new Date(2026, 9, 10, 0, 0), tz)).toBeUndefined();
  });

  it("NOTIF-06 events with the notification off and all-day events never take the slot", () => {
    expect(ambientReminder([quiet, fair], 15, at(11, 0), tz)).toBeUndefined();
  });

  it("NOTIF-06 nothing takes the slot with the lead time off", () => {
    expect(ambientReminder([dinner], "off", at(11, 0), tz)).toBeUndefined();
  });

  it("NOTIF-06 the latest-starting reminder wins the slot", () => {
    const later = { ...shift, id: "later", startAt: iso(11, 10) };

    expect(ambientReminder([later, dinner], 15, at(11, 0), tz)).toEqual({
      event: later,
      atStart: false,
    });
  });
});
