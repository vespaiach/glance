import Dexie from "dexie";
import { accountDbName, deleteGlanceDb, FIXTURE_DB_NAME, openGlanceDb } from "./db";

const ACCOUNT_A = "0195f0a0-0000-7000-8000-00000000000a";

const ACCOUNT_B = "0195f0a0-0000-7000-8000-00000000000b";

const EVENT = {
  id: "0195f0a0-0000-7000-8000-000000000101",
  startAt: "2026-10-09T15:00:00.000Z",
  title: "Soccer practice",
  everyone: true,
  memberIds: [],
  updatedAt: "2026-10-09T10:00:00.000Z",
  version: 1,
};

afterEach(async () => {
  await Promise.all([ACCOUNT_A, ACCOUNT_B].map((id) => deleteGlanceDb(accountDbName(id))));
});

describe("account database", () => {
  it("tech§4.1 names one database per account and one for fixture mode", () => {
    expect(accountDbName(ACCOUNT_A)).toBe(`glance-${ACCOUNT_A}`);
    expect(FIXTURE_DB_NAME).toBe("glance-fixture");
  });

  it("tech§4.1 opens with the entity, outbox and meta tables", async () => {
    const db = openGlanceDb(accountDbName(ACCOUNT_A));

    await db.open();

    expect(db.tables.map((table) => table.name).sort()).toEqual([
      "events",
      "members",
      "meta",
      "notes",
      "outbox",
      "photos",
      "settings",
      "weather",
    ]);
    expect(db.events.schema.idxByName).toHaveProperty("startAt");
    expect(db.notes.schema.idxByName).toHaveProperty("createdAt");
    expect(db.members.schema.idxByName).toHaveProperty("createdAt");
    expect(db.outbox.schema.primKey.auto).toBe(true);
    db.close();
  });

  it("tech§4.1 stores rows as domain types and numbers the outbox in order", async () => {
    const db = openGlanceDb(accountDbName(ACCOUNT_A));

    await db.events.put(EVENT);
    const first = await db.outbox.add({
      entity: "events",
      entityId: EVENT.id,
      op: "put",
      payload: EVENT,
      attempts: 0,
    });
    const second = await db.outbox.add({
      entity: "events",
      entityId: EVENT.id,
      op: "delete",
      attempts: 0,
    });

    expect(await db.events.get(EVENT.id)).toEqual(EVENT);
    expect(second).toBeGreaterThan(first);
    db.close();
  });

  it("tech§4.6 an upgrade from another context closes this connection and keeps the rows", async () => {
    const name = accountDbName(ACCOUNT_A);
    const db = openGlanceDb(name);
    await db.events.put(EVENT);
    const upgraded = new Dexie(name);
    upgraded.version(3).stores({ events: "id, startAt, deletedAt, title" });

    await upgraded.open();

    expect(db.isOpen()).toBe(false);
    expect(await upgraded.table("events").get(EVENT.id)).toEqual(EVENT);
    upgraded.close();
  });

  it("tech§4.1 the v2 upgrade makes stored events everyone events without a tone", async () => {
    const name = accountDbName(ACCOUNT_A);
    const old = new Dexie(name);
    old.version(1).stores({ events: "id, startAt, deletedAt" });
    const { everyone: _, memberIds: __, ...v1Event } = EVENT;
    await old.table("events").put({ ...v1Event, tone: "accent" });
    old.close();

    const db = openGlanceDb(name);

    expect(await db.events.get(EVENT.id)).toEqual(EVENT);
    db.close();
  });

  it("tech§4.1 deleting one account's database leaves another account's rows", async () => {
    const a = openGlanceDb(accountDbName(ACCOUNT_A));
    const b = openGlanceDb(accountDbName(ACCOUNT_B));
    await a.events.put(EVENT);
    await b.events.put(EVENT);

    await deleteGlanceDb(accountDbName(ACCOUNT_A));

    expect(await Dexie.exists(accountDbName(ACCOUNT_A))).toBe(false);
    expect(await b.events.get(EVENT.id)).toEqual(EVENT);
    b.close();
  });
});
