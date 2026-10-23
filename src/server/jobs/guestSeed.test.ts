import * as v from "valibot";
import { eventDayKey } from "@/domain/allDay";
import { CalendarEventSchema } from "@/domain/schemas";
import { MARIA, serviceHarnessPerTest } from "../services/testServices";
import { seedGuest } from "./guestSeed";

const harness = serviceHarnessPerTest();

const GUEST_EMAIL = "guests@takeaglance.app";

const EASTERN = "America/Indiana/Indianapolis";

async function guestId(): Promise<string> {
  const account = await harness.deps().db.accounts.byEmail(GUEST_EMAIL);

  return account?.id ?? "";
}

async function guestRows() {
  const { db } = harness.deps();

  const id = await guestId();

  return {
    events: await db.events.changedSince(id, 0),
    tags: await db.tags.changedSince(id, 0),
    notes: await db.notes.changedSince(id, 0),
    settings: await db.settings.get(id),
  };
}

describe("seedGuest", () => {
  it("SIGNIN-16 creates the guest account named Trinh, set up, in Carmel on Eastern time", async () => {
    await seedGuest(harness.deps(), GUEST_EMAIL);

    const account = await harness.deps().db.accounts.byEmail(GUEST_EMAIL);

    const { settings } = await guestRows();

    expect(account).toMatchObject({ name: "Trinh", timeZone: EASTERN });
    expect(account?.setupDoneAt).not.toBeNull();
    expect(settings?.weatherLocation).toMatchObject({
      name: "Carmel",
      region: "Indiana",
      timeZone: EASTERN,
    });
  });

  it("SIGNIN-16 seeds family tags, notes and valid events from the 1st of this month to Dec 31", async () => {
    await seedGuest(harness.deps(), GUEST_EMAIL);

    const { events, tags, notes } = await guestRows();

    const days = events.map((event) => eventDayKey(event, EASTERN)).sort();

    expect(tags.map((tag) => tag.name)).toContain("Trinh");
    expect(tags.length).toBeGreaterThanOrEqual(5);
    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(events.length).toBeGreaterThan(300);
    expect(events.every((event) => v.is(CalendarEventSchema, event))).toBe(true);
    expect(days[0]).toBe("2026-10-01");
    expect(days.at(-1)).toBe("2026-12-31");
  });

  it("SIGNIN-16 tags every seeded event with family tags or everyone", async () => {
    await seedGuest(harness.deps(), GUEST_EMAIL);

    const { events, tags } = await guestRows();

    const tagIds = new Set(tags.map((tag) => tag.id));

    expect(
      events.every(
        (event) =>
          event.everyone || (event.tagIds.length > 0 && event.tagIds.every((id) => tagIds.has(id))),
      ),
    ).toBe(true);
  });

  it("SIGNIN-16 leaves an existing guest account untouched", async () => {
    await seedGuest(harness.deps(), GUEST_EMAIL);

    const version = await harness.globalVersion();

    await seedGuest(harness.deps(), GUEST_EMAIL);

    expect(await harness.globalVersion()).toBe(version);
  });

  it("SIGNIN-16 does nothing without a guest email", async () => {
    await seedGuest(harness.deps(), undefined);

    expect(await harness.deps().db.accounts.byEmail(GUEST_EMAIL)).toBeUndefined();
    expect(await harness.globalVersion()).toBe(0);
  });

  it("SIGNIN-16 writes nothing to other accounts", async () => {
    await seedGuest(harness.deps(), GUEST_EMAIL);

    const { db } = harness.deps();

    expect(await db.events.changedSince(MARIA, 0)).toEqual([]);
    expect(await db.tags.changedSince(MARIA, 0)).toEqual([]);
    expect(await db.notes.changedSince(MARIA, 0)).toEqual([]);
    expect(await db.settings.get(MARIA)).toBeUndefined();
  });
});
