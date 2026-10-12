import { FIXTURE_ACCOUNT, FIXTURE_NOTES } from "@/fixtures/data";
import { deleteGlanceDb, type GlanceDb, type OutboxEntry, openGlanceDb } from "../db";
import { createFixtureTransport, seedFixtureDb } from "./fixtureTransport";
import { createInlineSyncHost } from "./host";
import { STATUS_KEY } from "./status";

const DB_NAME = "glance-host-test";

const NOW = new Date("2026-10-09T17:41:00.000Z");

const NOTE = FIXTURE_NOTES[0];

let db: GlanceDb;

beforeEach(async () => {
  db = openGlanceDb(DB_NAME);

  await seedFixtureDb(db, {});
});

afterEach(async () => {
  db.close();
  await deleteGlanceDb(DB_NAME);
});

function host() {
  const now = () => NOW;

  return createInlineSyncHost({
    db,
    transport: createFixtureTransport({ db, params: {}, now }),
    now,
  });
}

async function queueNoteEdit() {
  await db.outbox.add({
    entity: "notes",
    entityId: NOTE?.id ?? "",
    op: "put",
    payload: { ...NOTE, text: "Edited" },
    attempts: 0,
  } as OutboxEntry);
}

describe("inline sync host", () => {
  it("tech§4.6 start runs the engine inline and writes the status", async () => {
    const sync = host();

    await sync.start(FIXTURE_ACCOUNT.id);

    expect((await db.meta.get(STATUS_KEY))?.value).toEqual({
      online: true,
      lastSyncedAt: NOW.toISOString(),
      weather: { state: "idle" },
    });

    sync.stop();
  });

  it("tech§4.6 nudge drains the outbox through the transport", async () => {
    const sync = host();

    await sync.start(FIXTURE_ACCOUNT.id);
    await queueNoteEdit();

    await sync.nudge();

    expect(await db.outbox.count()).toBe(0);
    expect((await db.notes.get(NOTE?.id ?? ""))?.text).toBe("Edited");

    sync.stop();
  });

  it("tech§4.6 calls before start do nothing", async () => {
    await queueNoteEdit();

    await host().nudge();

    expect(await db.outbox.count()).toBe(1);
  });
});
