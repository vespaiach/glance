import Dexie from "dexie";
import { accountDbName, deleteGlanceDb, openGlanceDb } from "./db";

const ACCOUNT_A = "0195f0a0-0000-7000-8000-00000000000a";

const ACCOUNT_B = "0195f0a0-0000-7000-8000-00000000000b";

const EVENT = {
  id: "0195f0a0-0000-7000-8000-000000000101",
  startAt: "2026-10-09T15:00:00.000Z",
  title: "Soccer practice",
  everyone: true,
  tagIds: [],
  updatedAt: "2026-10-09T10:00:00.000Z",
  version: 1,
};

const MOM = {
  id: "0195f0a0-0000-7000-8000-000000000201",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-01T09:00:00.000Z",
  version: 2,
};

const OLD_SETTINGS = {
  accountId: ACCOUNT_A,
  season: "auto",
  clock: "12h",
  tempUnit: "F",
  background: { mode: "season", dim: 0.2, rotate: "daily" },
  updatedAt: "2026-10-01T09:00:00.000Z",
  version: 3,
};

const NOTE = {
  id: "0195f0a0-0000-7000-8000-000000000301",
  text: "Back at 6",
  author: "Mom",
  createdAt: "2026-10-09T09:00:00.000Z",
  rotation: -2,
  updatedAt: "2026-10-09T09:00:00.000Z",
  version: 1,
};

const GONE = { ...MOM, id: "0195f0a0-0000-7000-8000-000000000202", name: "Gone" };

afterEach(async () => {
  await Promise.all([ACCOUNT_A, ACCOUNT_B].map((id) => deleteGlanceDb(accountDbName(id))));
});

describe("account database", () => {
  it("tech§4.1 names one database per account", () => {
    expect(accountDbName(ACCOUNT_A)).toBe(`glance-${ACCOUNT_A}`);
  });

  it("tech§4.1 opens with the entity, outbox and meta tables", async () => {
    const db = openGlanceDb(accountDbName(ACCOUNT_A));

    await db.open();

    expect(db.tables.map((table) => table.name).sort()).toEqual([
      "events",
      "meta",
      "notes",
      "outbox",
      "photos",
      "settings",
      "tags",
      "weather",
    ]);
    expect(db.events.schema.idxByName).toHaveProperty("startAt");
    expect(db.notes.schema.idxByName).toHaveProperty("createdAt");
    expect(db.tags.schema.idxByName).toHaveProperty("createdAt");
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
    upgraded.version(5).stores({ events: "id, startAt, deletedAt, title" });

    await upgraded.open();

    expect(db.isOpen()).toBe(false);
    expect(await upgraded.table("events").get(EVENT.id)).toEqual(EVENT);
    upgraded.close();
  });

  it("tech§4.1 the v2 upgrade makes stored events everyone events without a tone", async () => {
    const name = accountDbName(ACCOUNT_A);
    const old = new Dexie(name);
    old.version(1).stores({ events: "id, startAt, deletedAt" });
    const { everyone: _, tagIds: __, ...v1Event } = EVENT;
    await old.table("events").put({ ...v1Event, tone: "accent" });
    old.close();

    const db = openGlanceDb(name);

    expect(await db.events.get(EVENT.id)).toEqual(EVENT);
    db.close();
  });

  it("tech§4.1 the v3 upgrade copies live members into tags and renames memberIds to tagIds", async () => {
    const name = accountDbName(ACCOUNT_A);
    const old = v2Dexie(name);
    const { tagIds: _, ...shared } = EVENT;
    const v2Event = { ...shared, everyone: false, memberIds: [MOM.id] };
    await old.table("members").bulkPut([MOM, { ...GONE, deletedAt: "2026-10-09T11:00:00.000Z" }]);
    await old.table("events").put(v2Event);
    old.close();

    const db = openGlanceDb(name);

    expect(await db.tags.toArray()).toEqual([MOM]);
    expect(await db.events.get(EVENT.id)).toEqual({ ...EVENT, everyone: false, tagIds: [MOM.id] });
    expect(db.tables.map((table) => table.name)).not.toContain("members");
    db.close();
  });

  it("tech§4.1 the v3 upgrade moves waiting member puts to tags and drops member deletes", async () => {
    const name = accountDbName(ACCOUNT_A);
    const old = v2Dexie(name);
    const { tagIds: _, ...shared } = EVENT;
    await old.table("outbox").bulkAdd([
      { entity: "members", entityId: MOM.id, op: "put", payload: MOM, attempts: 1 },
      { entity: "members", entityId: GONE.id, op: "delete", attempts: 0 },
      {
        entity: "events",
        entityId: EVENT.id,
        op: "put",
        payload: { ...shared, memberIds: [] },
        attempts: 0,
      },
    ]);
    old.close();

    const db = openGlanceDb(name);

    expect(await db.outbox.toArray()).toMatchObject([
      { entity: "tags", entityId: MOM.id, op: "put", payload: MOM, attempts: 1 },
      { entity: "events", entityId: EVENT.id, op: "put", payload: EVENT },
    ]);
    db.close();
  });

  it.each([
    [60, "1d", { on: true, minutes: 1 }, { on: true, days: 1 }],
    [180, "1w", { on: true, minutes: 3 }, { on: true, days: 7 }],
    [300, null, { on: true, minutes: 5 }, { on: false, days: 7 }],
    [null, "1w", { on: false, minutes: 3 }, { on: true, days: 7 }],
  ])(
    "SET-07 the v4 upgrade maps stored idle %s and note expiry %s as 010_settings_values does",
    async (idle, expiry, idleTimeout, noteExpiry) => {
      const name = accountDbName(ACCOUNT_A);
      const old = v3Dexie(name);
      await old.table("settings").put({ ...OLD_SETTINGS, idleTimeout: idle, noteExpiry: expiry });
      old.close();

      const db = openGlanceDb(name);

      expect(await db.settings.get(ACCOUNT_A)).toEqual({
        ...OLD_SETTINGS,
        idleTimeout,
        noteExpiry,
        hideSidebarWhenIdle: true,
      });
      db.close();
    },
  );

  it("SET-07 the v4 upgrade maps the values in a waiting settings put", async () => {
    const name = accountDbName(ACCOUNT_A);
    const old = v3Dexie(name);
    await old.table("outbox").bulkAdd([
      { entity: "events", entityId: EVENT.id, op: "put", payload: EVENT, attempts: 0 },
      {
        entity: "settings",
        entityId: ACCOUNT_A,
        op: "put",
        payload: { ...OLD_SETTINGS, idleTimeout: 300, noteExpiry: null },
        attempts: 2,
      },
    ]);
    old.close();

    const db = openGlanceDb(name);

    expect(await db.outbox.toArray()).toMatchObject([
      { entity: "events", payload: EVENT },
      {
        entity: "settings",
        payload: {
          ...OLD_SETTINGS,
          idleTimeout: { on: true, minutes: 5 },
          noteExpiry: { on: false, days: 7 },
          hideSidebarWhenIdle: true,
        },
        attempts: 2,
      },
    ]);
    db.close();
  });

  it("D27 the v5 upgrade deletes the tone from stored notes", async () => {
    const name = accountDbName(ACCOUNT_A);
    const old = v4Dexie(name);
    await old.table("notes").put({ ...NOTE, tone: "soft" });
    old.close();

    const db = openGlanceDb(name);

    expect(await db.notes.get(NOTE.id)).toEqual(NOTE);
    db.close();
  });

  it("D27 the v5 upgrade deletes the tone from waiting note puts", async () => {
    const name = accountDbName(ACCOUNT_A);
    const old = v4Dexie(name);
    await old.table("outbox").bulkAdd([
      { entity: "notes", entityId: NOTE.id, op: "put", payload: { ...NOTE, tone: 3 }, attempts: 1 },
      { entity: "notes", entityId: GONE.id, op: "delete", attempts: 0 },
      { entity: "events", entityId: EVENT.id, op: "put", payload: EVENT, attempts: 0 },
    ]);
    old.close();

    const db = openGlanceDb(name);

    expect(await db.outbox.toArray()).toEqual([
      { seq: 1, entity: "notes", entityId: NOTE.id, op: "put", payload: NOTE, attempts: 1 },
      { seq: 2, entity: "notes", entityId: GONE.id, op: "delete", attempts: 0 },
      { seq: 3, entity: "events", entityId: EVENT.id, op: "put", payload: EVENT, attempts: 0 },
    ]);
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

function v2Dexie(name: string): Dexie {
  const old = new Dexie(name);

  old.version(2).stores({
    events: "id, startAt, deletedAt",
    members: "id, createdAt, deletedAt",
    notes: "id, createdAt, deletedAt",
    photos: "id, createdAt",
    settings: "accountId",
    weather: "accountId",
    outbox: "++seq, entity, entityId",
    meta: "key",
  });

  return old;
}

function v3Dexie(name: string): Dexie {
  return tagsDexie(name, 3);
}

function v4Dexie(name: string): Dexie {
  return tagsDexie(name, 4);
}

function tagsDexie(name: string, version: number): Dexie {
  const old = new Dexie(name);

  old.version(version).stores({
    events: "id, startAt, deletedAt",
    tags: "id, createdAt, deletedAt",
    notes: "id, createdAt, deletedAt",
    photos: "id, createdAt",
    settings: "accountId",
    weather: "accountId",
    outbox: "++seq, entity, entityId",
    meta: "key",
  });

  return old;
}
