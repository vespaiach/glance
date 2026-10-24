import { ambientReminder, minutesLeft, reminderKey, remindersDue } from "./reminders";

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 9, h, m, s);
const ms = (h: number, m: number) => at(h, m).getTime();

const none = new Set<string>();

const shift = {
  id: "shift",
  title: "Volunteer shift",
  startAt: iso(11, 0),
  reminder: "15min",
} as const;
const piano = {
  id: "piano",
  title: "Piano lesson",
  startAt: iso(11, 0),
  reminder: "start",
} as const;
const movie = { id: "movie", title: "Movie night", startAt: iso(11, 0), reminder: "both" } as const;
const quiet = { id: "quiet", title: "Nap", startAt: iso(11, 0), reminder: "off" } as const;
const fair = {
  id: "fair",
  title: "School fair",
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  reminder: "both",
} as const;

const at330 = (id: string, title: string, m = 30) =>
  ({ id, title, startAt: iso(15, m), reminder: "15min" }) as const;

describe("remindersDue", () => {
  it("NOTIF-01 a 15 min reminder fires 15 minutes before the start", () => {
    expect(remindersDue([shift], at(10, 45), none)).toEqual([
      {
        kind: "15min",
        fireAt: ms(10, 45),
        startAt: shift.startAt,
        events: [shift],
        keys: [`shift:15min:${ms(10, 45)}`],
        titles: ["Volunteer shift"],
        more: 0,
      },
    ]);
  });

  it("NOTIF-01 an at-start reminder fires at the start", () => {
    const [group] = remindersDue([piano], at(11, 0), none);

    expect(group).toMatchObject({ kind: "start", fireAt: ms(11, 0), events: [piano] });
  });

  it("NOTIF-01 a 15 min reminder does not fire at the start and an at-start one not before it", () => {
    expect(remindersDue([shift], at(11, 0), none)).toEqual([]);

    expect(remindersDue([piano], at(10, 45), none)).toEqual([]);
  });

  it("NOTIF-01 both fires 15 minutes before and at the start", () => {
    expect(remindersDue([movie], at(10, 45), none).map((group) => group.kind)).toEqual(["15min"]);

    expect(remindersDue([movie], at(11, 0), none).map((group) => group.kind)).toEqual(["start"]);
  });

  it("NOTIF-01 off never fires", () => {
    expect(remindersDue([quiet], at(10, 45), none)).toEqual([]);

    expect(remindersDue([quiet], at(11, 0), none)).toEqual([]);
  });

  it("NOTIF-01 all-day events have no reminder", () => {
    expect(remindersDue([fair], new Date("2026-10-08T23:45:00.000Z"), none)).toEqual([]);

    expect(remindersDue([fair], new Date("2026-10-09T00:00:00.000Z"), none)).toEqual([]);
  });

  it("NOTIF-01 nothing is due before the fire time", () => {
    expect(remindersDue([shift], at(10, 44, 59), none)).toEqual([]);
  });

  it("NOTIF-01 a reminder is due through the minute it fires in", () => {
    expect(remindersDue([piano], at(11, 0, 59), none)).toHaveLength(1);

    expect(remindersDue([piano], at(11, 1), none)).toEqual([]);
  });

  it("NOTIF-02 a missed 15 min reminder shows before the start with the real time left", () => {
    const now = at(10, 54);

    const [group] = remindersDue([shift], now, none);

    expect(group).toMatchObject({ kind: "15min", fireAt: ms(10, 45) });

    expect(group && minutesLeft(group, now)).toBe(6);
  });

  it("NOTIF-02 a missed reminder is skipped once the event started", () => {
    expect(remindersDue([shift], at(11, 0), none)).toEqual([]);

    expect(remindersDue([movie], at(11, 5), none)).toEqual([]);
  });

  it("NOTIF-02 a reminder already seen is not due again", () => {
    const seen = new Set([reminderKey("shift", "15min", ms(10, 45))]);

    expect(remindersDue([shift], at(10, 46), seen)).toEqual([]);
  });

  it("NOTIF-02 a moved event fires again at its new time", () => {
    const seen = new Set([reminderKey("shift", "15min", ms(10, 45))]);
    const moved = { ...shift, startAt: iso(11, 30) };

    expect(remindersDue([moved], at(11, 15), seen)).toHaveLength(1);
  });

  it("NOTIF-02 a deleted event or one turned off has nothing due", () => {
    expect(remindersDue([], at(10, 45), none)).toEqual([]);

    expect(remindersDue([{ ...shift, reminder: "off" }], at(10, 45), none)).toEqual([]);
  });

  it("NOTIF-04 reminders of the same minute merge into one group in start order", () => {
    const soccer = at330("soccer", "Soccer practice");
    const dentist = {
      ...at330("dentist", "Dentist"),
      startAt: new Date(2026, 9, 9, 15, 30, 30).toISOString(),
    };
    const lesson = at330("lesson", "Piano lesson");

    const groups = remindersDue([dentist, lesson, soccer], at(15, 15, 30), none);

    expect(groups).toHaveLength(1);

    expect(groups[0]?.events.map((event) => event.id)).toEqual(["lesson", "soccer", "dentist"]);

    expect(groups[0]).toMatchObject({
      titles: ["Piano lesson", "Soccer practice", "Dentist"],
      more: 0,
    });
  });

  it("NOTIF-04 reminders of different minutes or kinds stay apart", () => {
    const early = { ...movie, id: "early", startAt: iso(10, 45) };

    const groups = remindersDue([movie, early], at(10, 45), none);

    expect(groups.map((group) => group.kind)).toEqual(["15min", "start"]);
  });

  it("NOTIF-04 over 3 events a group shows the first 2 titles and how many more", () => {
    const events = ["A", "B", "C", "D", "E"].map((title) => at330(title, title));

    const [group] = remindersDue(events, at(15, 15), none);

    expect(group).toMatchObject({ titles: ["A", "B"], more: 3 });

    expect(group?.keys).toHaveLength(5);
  });
});

describe("ambientReminder", () => {
  const tz = "Asia/Kolkata";

  const dinner = { ...shift, id: "dinner", endAt: iso(12, 0) };

  it("NOTIF-06 takes the slot 15 min before the start and reads In until the start", () => {
    expect(ambientReminder([dinner], at(10, 44, 59), tz)).toBeUndefined();
    expect(ambientReminder([dinner], at(10, 45), tz)).toEqual({ event: dinner, atStart: false });
    expect(ambientReminder([dinner], at(10, 59, 59), tz)).toEqual({
      event: dinner,
      atStart: false,
    });
  });

  it("NOTIF-06 from the start it reads Now until the event ends", () => {
    expect(ambientReminder([dinner], at(11, 0), tz)).toEqual({ event: dinner, atStart: true });
    expect(ambientReminder([dinner], at(11, 59, 59), tz)).toEqual({ event: dinner, atStart: true });
    expect(ambientReminder([dinner], at(12, 0), tz)).toBeUndefined();
  });

  it("NOTIF-06 an event with no end keeps the slot until its day ends", () => {
    expect(ambientReminder([shift], at(23, 59), tz)).toEqual({ event: shift, atStart: true });
    expect(ambientReminder([shift], new Date(2026, 9, 10, 0, 0), tz)).toBeUndefined();
  });

  it("NOTIF-06 an at-start reminder takes the slot only from the start", () => {
    expect(ambientReminder([piano], at(10, 50), tz)).toBeUndefined();
    expect(ambientReminder([piano], at(11, 0), tz)).toEqual({ event: piano, atStart: true });
  });

  it("NOTIF-06 events with the reminder off and all-day events never take the slot", () => {
    expect(ambientReminder([quiet, fair], at(11, 0), tz)).toBeUndefined();
  });

  it("NOTIF-06 the latest-starting reminder wins the slot", () => {
    const later = { ...shift, id: "later", startAt: iso(11, 10) };

    expect(ambientReminder([later, dinner], at(11, 0), tz)).toEqual({
      event: later,
      atStart: false,
    });
  });
});
