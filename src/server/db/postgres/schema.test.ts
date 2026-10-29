import { pullChanges } from "../../services/sync";
import { postgresDatabase } from ".";
import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { openPglite, pgliteSql } from "./pglite";
import type { Sql } from "./sql";
import { migratedSqlPerTest } from "./testSql";

const db = migratedSqlPerTest();

const NOW = "2026-10-09T14:00:00.000Z";

async function insertAccount(id: string): Promise<void> {
  await db().run(
    "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ($1, $2, 'America/New_York', $3)",
    [id, `${id}@example.com`, NOW],
  );
}

async function insertEvent(startAt: string, endAt: string | null): Promise<void> {
  await db().run(
    "INSERT INTO events (id, account_id, title, start_at, end_at, updated_at, version) VALUES ('e1', 'a1', 'Swim', $1, $2, $3, 1)",
    [startAt, endAt, NOW],
  );
}

async function insertNote(): Promise<void> {
  await db().run(
    "INSERT INTO notes (id, account_id, text, rotation, created_at, updated_at, version) VALUES ('n1', 'a1', 'Hi', 1.5, $1, $1, 1)",
    [NOW],
  );
}

describe("001_init", () => {
  it("spec§7.0 creates every v1 table", async () => {
    const rows = await db().all<{ name: string }>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );

    expect(rows.map((row) => row.name)).toEqual([
      "accounts",
      "displays",
      "events",
      "imports",
      "magic_links",
      "notes",
      "photo_file_cleanup",
      "photos",
      "push_subscriptions",
      "reminder_sends",
      "revoked_sessions",
      "schema_migrations",
      "sessions",
      "settings",
      "sign_in_codes",
      "sync_state",
      "tags",
      "weather_cache",
    ]);
  });

  it("spec§7.0 starts the global change counter at 0", async () => {
    expect(await db().all("SELECT id, version FROM sync_state")).toEqual([{ id: 1, version: 0 }]);
  });

  it("spec§7.0 allows only one sync_state row", async () => {
    await expect(db().run("INSERT INTO sync_state VALUES (2, 0)")).rejects.toThrow(
      /check constraint/,
    );
  });

  it("spec§7.0 rejects an event that ends at or before it starts", async () => {
    await insertAccount("a1");

    await expect(insertEvent(NOW, NOW)).rejects.toThrow(/check constraint/);
    await expect(insertEvent(NOW, null)).resolves.toBeUndefined();
  });

  it("spec§7.0 rejects a row whose account doesn't exist", async () => {
    await expect(insertEvent(NOW, null)).rejects.toThrow(/foreign key constraint/);
  });

  it("spec§7.0 matches account emails without case", async () => {
    await insertAccount("a1");

    const found = await db().one("SELECT id FROM accounts WHERE email = $1", ["A1@Example.com"]);

    expect(found).toEqual({ id: "a1" });
  });

  it("spec§7.0 rejects a second account with the same email in another case", async () => {
    await insertAccount("a1");

    await expect(
      db().run(
        "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a2', 'A1@EXAMPLE.COM', 'UTC', $1)",
        [NOW],
      ),
    ).rejects.toThrow(/unique constraint/);
  });

  it("spec§7.0 defaults a note's author to Guest", async () => {
    await insertAccount("a1");

    await insertNote();

    expect(await db().one("SELECT author FROM notes")).toEqual({ author: "Guest" });
  });

  it("spec§7.0 reads timestamps as ISO strings and versions and rotations as numbers", async () => {
    await insertAccount("a1");
    await insertNote();

    const note = await db().one("SELECT created_at, rotation, version FROM notes");

    expect(note).toEqual({ created_at: NOW, rotation: 1.5, version: 1 });
  });

  it("spec§7.0 stores a photo's taken_on as a date", async () => {
    await insertAccount("a1");

    await db().run(
      `INSERT INTO photos (id, account_id, title, taken_on, file_path, created_at, updated_at, version,
         title_source, date_source, place_source)
       VALUES ('p1', 'a1', 'Beach', '2026-07-04', 'p1', $1, $1, 1, 'file-name', 'photo', 'none')`,
      [NOW],
    );

    expect(await db().one("SELECT taken_on FROM photos")).toEqual({ taken_on: "2026-07-04" });
  });

  it("spec§7.0 stores settings as jsonb", async () => {
    await insertAccount("a1");

    await db().run(
      "INSERT INTO settings (account_id, json, updated_at, version) VALUES ('a1', $1, $2, 1)",
      [JSON.stringify({ clock: "24h" }), NOW],
    );

    const row = await db().one("SELECT json, json ->> 'clock' AS clock FROM settings");

    expect(row).toEqual({ json: { clock: "24h" }, clock: "24h" });
  });

  it("SIGNIN-14 leaves setup_done_at empty for a new account", async () => {
    await insertAccount("a1");

    expect(await db().one("SELECT setup_done_at FROM accounts")).toEqual({ setup_done_at: null });
  });
});

describe("002_event_all_day", () => {
  it("spec§7.0 an event is timed unless it says all day", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    expect(await db().one("SELECT all_day FROM events")).toEqual({ all_day: false });
  });

  it("D21 rejects an all-day event with an end", async () => {
    await insertAccount("a1");

    await expect(
      db().run(
        "INSERT INTO events (id, account_id, title, start_at, end_at, all_day, updated_at, version) VALUES ('e1', 'a1', 'Trip', $1, $2, true, $1, 1)",
        ["2026-10-16T00:00:00.000Z", "2026-10-16T05:00:00.000Z"],
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

async function insertPhoto(
  id: string,
  sources: { title: string; date: string; place: string },
): Promise<void> {
  await db().run(
    `INSERT INTO photos (id, account_id, title, taken_on, file_path, created_at, updated_at, version,
       title_source, date_source, place_source)
     VALUES ($1, 'a1', 'Beach', NULL, $1, $2, $2, 1, $3, $4, $5)`,
    [id, NOW, sources.title, sources.date, sources.place],
  );
}

describe("003_photo_details", () => {
  it("D22 stores a photo with no date, its sources and not checked", async () => {
    await insertAccount("a1");
    await insertPhoto("p1", { title: "place", date: "none", place: "photo-location" });

    expect(
      await db().one(
        "SELECT taken_on, title_source, date_source, place_source, checked, deleted_at FROM photos",
      ),
    ).toEqual({
      taken_on: null,
      title_source: "place",
      date_source: "none",
      place_source: "photo-location",
      checked: false,
      deleted_at: null,
    });
  });

  it.each([
    { title: "gps", date: "photo", place: "none" },
    { title: "photo", date: "exif", place: "none" },
    { title: "photo", date: "photo", place: "photo" },
  ])("D22 rejects an unknown source %o", async (sources) => {
    await insertAccount("a1");

    await expect(insertPhoto("p1", sources)).rejects.toThrow(/check constraint/);
  });

  it("D22 gives B05's photos their upload time, their sources, checked and a new version", async () => {
    const client = await openPglite();
    const old = pgliteSql(client);
    const migrations = readMigrations(MIGRATIONS_DIR);
    await migrate(
      old,
      migrations.filter((migration) => migration.version < 3),
    );
    await old.run(
      "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a1', 'a1@example.com', 'America/New_York', $1)",
      [NOW],
    );
    await old.run("UPDATE sync_state SET version = 7");
    await old.run(
      `INSERT INTO photos (id, account_id, title, taken_on, file_path, created_at, version) VALUES
         ('exif', 'a1', 'IMG_1', '2024-07-04', 'exif', '2026-10-09T14:00:00.000Z', 3),
         ('upload', 'a1', 'IMG_2', '2026-10-09', 'upload', '2026-10-10T02:00:00.000Z', 7)`,
    );

    await migrate(old, migrations);

    expect(
      await old.all(
        "SELECT id, updated_at, title_source, date_source, place_source, checked, version FROM photos ORDER BY id",
      ),
    ).toEqual([
      {
        id: "exif",
        updated_at: "2026-10-09T14:00:00.000Z",
        title_source: "file",
        date_source: "photo",
        place_source: "none",
        checked: true,
        version: 8,
      },
      {
        id: "upload",
        updated_at: "2026-10-10T02:00:00.000Z",
        title_source: "file",
        date_source: "file-date",
        place_source: "none",
        checked: true,
        version: 8,
      },
    ]);
    expect(await old.one("SELECT version FROM sync_state")).toEqual({ version: 8 });
    await client.close();
  });
});

async function insertDisplay(columns: string, values: string): Promise<void> {
  await db().run(`INSERT INTO displays (id, account_id${columns}) VALUES ('d1', 'a1'${values})`);
}

describe("005_display_device", () => {
  it("D23 a display is a monitor with no browser unless told", async () => {
    await insertAccount("a1");
    await insertDisplay("", "");

    expect(await db().one("SELECT kind, browser FROM displays")).toEqual({
      kind: "monitor",
      browser: null,
    });
  });

  it("D23 stores a tablet's kind and browser", async () => {
    await insertAccount("a1");
    await insertDisplay(", kind, browser", ", 'tablet', 'Safari'");

    expect(await db().one("SELECT kind, browser FROM displays")).toEqual({
      kind: "tablet",
      browser: "Safari",
    });
  });

  it("D23 rejects an unknown device kind", async () => {
    await insertAccount("a1");

    await expect(insertDisplay(", kind", ", 'watch'")).rejects.toThrow(/check constraint/);
  });
});

async function insertLink(columns: string, values: string): Promise<void> {
  await db().run(
    `INSERT INTO magic_links (token_hash, expires_at${columns}) VALUES ('h1', '${NOW}'${values})`,
  );
}

async function insertCode(email: string): Promise<void> {
  await db().run(
    "INSERT INTO sign_in_codes (email, code_hash, time_zone, expires_at) VALUES ($1, 'c1', 'America/New_York', $2)",
    [email, NOW],
  );
}

describe("008_sign_in_codes", () => {
  it("D11 a code row starts with no tries", async () => {
    await insertCode("a1@example.com");

    expect(await db().one("SELECT email, tries, expires_at FROM sign_in_codes")).toEqual({
      email: "a1@example.com",
      tries: 0,
      expires_at: NOW,
    });
  });

  it("D11 keeps one code row per email", async () => {
    await insertCode("a1@example.com");

    await expect(insertCode("a1@example.com")).rejects.toThrow(/duplicate key/);
  });

  it("D23 a QR link needs its account and display", async () => {
    await insertAccount("a1");
    await insertDisplay("", "");

    await expect(insertLink(", account_id", ", 'a1'")).rejects.toThrow(/not-null/);
    await expect(insertLink(", display_id", ", 'd1'")).rejects.toThrow(/not-null/);
    await expect(insertLink(", account_id, display_id", ", 'a1', 'd1'")).resolves.toBeUndefined();
  });

  it("D23 deleting a display deletes its QR links", async () => {
    await insertAccount("a1");
    await insertDisplay("", "");
    await insertLink(", account_id, display_id", ", 'a1', 'd1'");

    await db().run("DELETE FROM displays WHERE id = 'd1'");

    expect(await db().all("SELECT token_hash FROM magic_links")).toEqual([]);
  });

  it("D11 drops the email links and keeps the QR links", async () => {
    const client = await openPglite();
    const old = pgliteSql(client);
    const migrations = readMigrations(MIGRATIONS_DIR);
    await migrate(
      old,
      migrations.filter((migration) => migration.version < 8),
    );
    await old.run(
      "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a1', 'a1@example.com', 'America/New_York', $1)",
      [NOW],
    );
    await old.run("INSERT INTO displays (id, account_id) VALUES ('d1', 'a1')");
    await old.run(
      `INSERT INTO magic_links (token_hash, email, kind, pending_id, account_id, display_id, time_zone, expires_at) VALUES
         ('email', 'a1@example.com', 'email', 'p1', NULL, NULL, 'America/New_York', $1),
         ('qr', 'a1@example.com', 'qr', NULL, 'a1', 'd1', 'America/New_York', $1)`,
      [NOW],
    );

    await migrate(old, migrations);

    expect(await old.all("SELECT * FROM magic_links")).toEqual([
      { token_hash: "qr", expires_at: NOW, used_at: null, account_id: "a1", display_id: "d1" },
    ]);
    await client.close();
  });
});

async function insertTag(id: string, name: string, color = "lilac"): Promise<void> {
  await db().run(
    "INSERT INTO tags (id, account_id, name, color, created_at, updated_at, version) VALUES ($1, 'a1', $2, $3, $4, $4, 1)",
    [id, name, color, NOW],
  );
}

describe("009_tags", () => {
  it("D24 an event is for everyone with no tags, no notes and no tone", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    expect(await db().one("SELECT * FROM events")).toMatchObject({
      everyone: true,
      tag_ids: [],
      notes: null,
    });
    expect(await db().one("SELECT * FROM events")).not.toHaveProperty("tone");
  });

  it("D24 stores an event's tag ids as an array", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    await db().run("UPDATE events SET everyone = false, tag_ids = $1", [["m1", "m2"]]);

    expect(await db().one("SELECT tag_ids FROM events")).toEqual({ tag_ids: ["m1", "m2"] });
  });

  it("D24 rejects an everyone event that also names tags", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    await expect(db().run("UPDATE events SET tag_ids = $1", [["m1"]])).rejects.toThrow(
      /check constraint/,
    );
  });

  it("§7 rejects a tag color outside the 12 block colors", async () => {
    await insertAccount("a1");

    await expect(insertTag("m1", "Mom", "navy")).rejects.toThrow(/check constraint/);
  });

  it("FAM-04 rejects a second tag with the same name in another case", async () => {
    await insertAccount("a1");
    await insertTag("m1", "Mom");

    await expect(insertTag("m2", "MOM")).rejects.toThrow(/unique constraint/);
  });

  it("D24 renames members to tags, drops removed ones and bumps one version per family", async () => {
    const { client, old } = await migratedTo(9);
    await old.run(
      `INSERT INTO accounts (id, email, time_zone, created_at) VALUES
         ('a1', 'a1@example.com', 'America/New_York', $1),
         ('a2', 'a2@example.com', 'America/New_York', $1)`,
      [NOW],
    );
    await old.run("UPDATE sync_state SET version = 10");
    await old.run(
      `INSERT INTO members (id, account_id, name, color, created_at, updated_at, deleted_at, version) VALUES
         ('m1', 'a1', 'Mom', 'lilac', $1, $1, NULL, 3),
         ('m2', 'a1', 'Dad', 'sky', $1, $1, NULL, 4),
         ('m3', 'a1', 'Gone', 'mint', $1, $1, $1, 5),
         ('m4', 'a2', 'Omar', 'coral', $1, $1, NULL, 6)`,
      [NOW],
    );

    await migrate(old, readMigrations(MIGRATIONS_DIR));

    expect(await old.all("SELECT id, account_id, version FROM tags ORDER BY id")).toEqual([
      { id: "m1", account_id: "a1", version: 11 },
      { id: "m2", account_id: "a1", version: 11 },
      { id: "m4", account_id: "a2", version: 12 },
    ]);
    expect(await old.one("SELECT version FROM sync_state")).toEqual({ version: 12 });
    await client.close();
  });

  it("D24 an old event pulls with tagIds", async () => {
    const { client, old } = await migratedTo(9);
    await old.run(
      "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a1', 'a1@example.com', 'America/New_York', $1)",
      [NOW],
    );
    await old.run(
      "INSERT INTO members (id, account_id, name, color, created_at, updated_at, version) VALUES ('m1', 'a1', 'Mom', 'lilac', $1, $1, 1)",
      [NOW],
    );
    await old.run(
      "INSERT INTO events (id, account_id, title, start_at, everyone, member_ids, updated_at, version) VALUES ('e1', 'a1', 'Swim', $1, false, '{m1}', $1, 2)",
      [NOW],
    );

    await migrate(old, readMigrations(MIGRATIONS_DIR));

    const pulled = await pullChanges(
      { db: postgresDatabase(old), now: () => new Date(NOW) },
      "a1",
      undefined,
    );
    expect(pulled.changes.find((change) => change.entity === "events")?.row).toMatchObject({
      id: "e1",
      everyone: false,
      tagIds: ["m1"],
    });
    expect(pulled.changes.find((change) => change.entity === "tags")?.row).toMatchObject({
      id: "m1",
      name: "Mom",
    });
    await client.close();
  });

  it("D24 an event that names tags can't be for everyone", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    await expect(
      db().run("UPDATE events SET everyone = true, tag_ids = $1", [["m1"]]),
    ).rejects.toThrow(/events_everyone_no_tags/);
  });
});

describe("010_settings_values", () => {
  it.each([
    [60, "1d", { on: true, minutes: 1 }, { on: true, days: 1 }],
    [180, "1w", { on: true, minutes: 3 }, { on: true, days: 7 }],
    [300, null, { on: true, minutes: 5 }, { on: false, days: 7 }],
    [null, "1w", { on: false, minutes: 3 }, { on: true, days: 7 }],
  ])(
    "SET-07 maps idle %s and note expiry %s to on/off values and turns on hide sidebar when idle",
    async (idle, expiry, idleTimeout, noteExpiry) => {
      const { client, old } = await migratedTo(10);
      await old.run(
        "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a1', 'a1@example.com', 'America/New_York', $1)",
        [NOW],
      );
      await insertOldSettings(old, "a1", idle, expiry);

      await migrate(old, migrationsThrough(10));

      expect(await old.one("SELECT json FROM settings")).toEqual({
        json: { ...OLD_SETTINGS, idleTimeout, noteExpiry, hideSidebarWhenIdle: true },
      });
      await client.close();
    },
  );

  it("SET-07 bumps one version per account so screens pull the new values", async () => {
    const { client, old } = await migratedTo(10);
    await old.run(
      `INSERT INTO accounts (id, email, time_zone, created_at) VALUES
         ('a1', 'a1@example.com', 'America/New_York', $1),
         ('a2', 'a2@example.com', 'America/New_York', $1)`,
      [NOW],
    );
    await old.run("UPDATE sync_state SET version = 10");
    await insertOldSettings(old, "a1", 180, "1w");
    await insertOldSettings(old, "a2", null, null);

    await migrate(old, migrationsThrough(10));

    expect(await old.all("SELECT account_id, version FROM settings ORDER BY account_id")).toEqual([
      { account_id: "a1", version: 11 },
      { account_id: "a2", version: 12 },
    ]);
    expect(await old.one("SELECT version FROM sync_state")).toEqual({ version: 12 });
    const pulled = await pullChanges(
      { db: postgresDatabase(old), now: () => new Date(NOW) },
      "a2",
      10,
    );
    expect(pulled.changes).toEqual([
      {
        entity: "settings",
        row: expect.objectContaining({
          idleTimeout: { on: false, minutes: 3 },
          noteExpiry: { on: false, days: 7 },
          hideSidebarWhenIdle: true,
        }),
      },
    ]);
    await client.close();
  });
});

describe("011_note_tone", () => {
  it("D27 drops the tone from notes and keeps the notes", async () => {
    const { client, old } = await migratedTo(11);
    await old.run(
      "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a1', 'a1@example.com', 'America/New_York', $1)",
      [NOW],
    );
    await old.run(
      "INSERT INTO notes (id, account_id, text, author, tone, rotation, created_at, updated_at, version) VALUES ('n1', 'a1', 'Hi', 'Mia', 'soft', 1.5, $1, $1, 1)",
      [NOW],
    );

    await migrate(old, readMigrations(MIGRATIONS_DIR));

    const note = await old.one("SELECT * FROM notes");
    expect(note).toMatchObject({ id: "n1", text: "Hi", author: "Mia", version: 1 });
    expect(note).not.toHaveProperty("tone");
    await client.close();
  });
});

describe("017_notify", () => {
  it("D29 an event saved without a notification stores it on", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    expect(await db().one("SELECT notify FROM events")).toEqual({ notify: true });
  });

  it("D29 turns an event's reminder off into notification off and every other reminder into on", async () => {
    const { client, old } = await migratedTo(17);
    await old.run(
      "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a1', 'a1@example.com', 'America/New_York', $1)",
      [NOW],
    );
    for (const [id, reminder] of [
      ["e1", "off"],
      ["e2", "start"],
      ["e3", "15min"],
      ["e4", "both"],
    ]) {
      await old.run(
        "INSERT INTO events (id, account_id, title, start_at, reminder, updated_at, version) VALUES ($1, 'a1', 'Swim', $2, $3, $2, 1)",
        [id, NOW, reminder],
      );
    }

    await migrate(old, readMigrations(MIGRATIONS_DIR));

    expect(await old.all("SELECT id, notify FROM events ORDER BY id")).toEqual([
      { id: "e1", notify: false },
      { id: "e2", notify: true },
      { id: "e3", notify: true },
      { id: "e4", notify: true },
    ]);
    expect(await old.one("SELECT * FROM events")).not.toHaveProperty("reminder");
    await client.close();
  });

  it("NOTIF-08 rewrites the default reminder as the lead time and bumps one version per account", async () => {
    const { client, old } = await migratedTo(17);
    await old.run(
      `INSERT INTO accounts (id, email, time_zone, created_at) VALUES
         ('a1', 'a1@example.com', 'America/New_York', $1),
         ('a2', 'a2@example.com', 'America/New_York', $1),
         ('a3', 'a3@example.com', 'America/New_York', $1)`,
      [NOW],
    );
    await old.run("UPDATE sync_state SET version = 10");
    for (const [accountId, defaultReminder] of [
      ["a1", "off"],
      ["a2", "both"],
      ["a3", undefined],
    ]) {
      await old.run(
        "INSERT INTO settings (account_id, json, updated_at, version) VALUES ($1, $2, $3, 1)",
        [accountId, JSON.stringify({ ...OLD_SETTINGS, defaultReminder }), NOW],
      );
    }

    await migrate(old, readMigrations(MIGRATIONS_DIR));

    expect(
      await old.all("SELECT account_id, json, version FROM settings ORDER BY account_id"),
    ).toEqual([
      { account_id: "a1", json: { ...OLD_SETTINGS, notifyLead: "off" }, version: 11 },
      { account_id: "a2", json: { ...OLD_SETTINGS, notifyLead: 15 }, version: 12 },
      { account_id: "a3", json: { ...OLD_SETTINGS, notifyLead: 15 }, version: 13 },
    ]);
    expect(await old.one("SELECT version FROM sync_state")).toEqual({ version: 13 });
    await client.close();
  });

  it("D30 drops at-start sends and accepts sends at the 15 or 30 min lead only", async () => {
    const { client, old } = await migratedTo(17);
    await old.run(
      "INSERT INTO accounts (id, email, time_zone, created_at) VALUES ('a1', 'a1@example.com', 'America/New_York', $1)",
      [NOW],
    );
    await old.run(
      "INSERT INTO events (id, account_id, title, start_at, updated_at, version) VALUES ('e1', 'a1', 'Swim', $1, $1, 1)",
      [NOW],
    );
    const send =
      "INSERT INTO reminder_sends (event_id, kind, fire_at, sent_at) VALUES ('e1', $1, $2, $2)";
    await old.run(send, ["start", NOW]);

    await migrate(old, readMigrations(MIGRATIONS_DIR));

    expect(await old.all("SELECT kind FROM reminder_sends")).toEqual([]);
    await old.run(send, ["30min", NOW]);
    await expect(old.run(send, ["start", "2026-10-09T15:00:00.000Z"])).rejects.toThrow(
      /check constraint/,
    );
    await client.close();
  });
});

describe("014_push", () => {
  it("D30 deleting a display deletes its push subscription", async () => {
    await insertAccount("a1");
    await insertDisplay("", "");
    await db().run(
      "INSERT INTO push_subscriptions (id, account_id, display_id, endpoint, p256dh, auth, created_at) VALUES ('p1', 'a1', 'd1', 'https://push.example.com/1', 'k', 'a', $1)",
      [NOW],
    );

    await db().run("DELETE FROM displays");

    expect(await db().all("SELECT id FROM push_subscriptions")).toEqual([]);
  });

  it("D30 keeps one send per event, kind and fire time", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);
    const send =
      "INSERT INTO reminder_sends (event_id, kind, fire_at, sent_at) VALUES ('e1', '15min', $1, $1)";
    await db().run(send, [NOW]);

    await expect(db().run(send, [NOW])).rejects.toThrow(/duplicate key/);
  });
});

describe("007_members", () => {
  it("D24 gives each named account one lilac member and turns old events into everyone events", async () => {
    const client = await openPglite();
    const old = pgliteSql(client);
    const migrations = readMigrations(MIGRATIONS_DIR);
    await migrate(
      old,
      migrations.filter((migration) => migration.version < 7),
    );
    await old.run(
      `INSERT INTO accounts (id, email, name, time_zone, created_at) VALUES
         ('a1', 'a1@example.com', 'Maria', 'America/New_York', $1),
         ('a2', 'a2@example.com', NULL, 'America/New_York', $1)`,
      [NOW],
    );
    await old.run("UPDATE sync_state SET version = 4");
    await old.run(
      "INSERT INTO events (id, account_id, title, start_at, tone, updated_at, version) VALUES ('e1', 'a1', 'Swim', $1, 'accent', $1, 4)",
      [NOW],
    );

    await migrate(
      old,
      migrations.filter((migration) => migration.version < 9),
    );

    const members = await old.all<Record<string, unknown>>(
      "SELECT id, account_id, name, color, created_at, deleted_at, version FROM members",
    );
    expect(members).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
        account_id: "a1",
        name: "Maria",
        color: "lilac",
        created_at: NOW,
        deleted_at: null,
        version: 5,
      },
    ]);
    expect(await old.one("SELECT version FROM sync_state")).toEqual({ version: 5 });
    expect(await old.one("SELECT everyone, member_ids, version FROM events")).toEqual({
      everyone: true,
      member_ids: [],
      version: 4,
    });
    await client.close();
  });
});

const OLD_SETTINGS = {
  season: "auto",
  clock: "12h",
  tempUnit: "F",
  background: { mode: "season", dim: 0.2, rotate: "daily" },
};

async function insertOldSettings(
  old: Sql,
  accountId: string,
  idleTimeout: number | null,
  noteExpiry: string | null,
): Promise<void> {
  await old.run(
    "INSERT INTO settings (account_id, json, updated_at, version) VALUES ($1, $2, $3, 1)",
    [accountId, JSON.stringify({ ...OLD_SETTINGS, idleTimeout, noteExpiry }), NOW],
  );
}

function migrationsThrough(version: number) {
  return readMigrations(MIGRATIONS_DIR).filter((migration) => migration.version <= version);
}

async function migratedTo(version: number) {
  const client = await openPglite();

  const old = pgliteSql(client);

  await migrate(
    old,
    readMigrations(MIGRATIONS_DIR).filter((migration) => migration.version < version),
  );

  return { client, old };
}

describe("018_event_repeat", () => {
  it("EVT-14 an event is one-off unless it repeats weekly", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    expect(await db().one("SELECT repeat FROM events")).toEqual({ repeat: null });
  });

  it("tech§6.7 rejects a repeat other than weekly", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    await expect(db().run("UPDATE events SET repeat = 'daily'")).rejects.toThrow(
      /check constraint/,
    );
    await db().run("UPDATE events SET repeat = 'weekly'");
    expect(await db().one("SELECT repeat FROM events")).toEqual({ repeat: "weekly" });
  });
});

describe("019_event_exdates", () => {
  it("EVT-14 an event has no exception dates unless saved with some", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    expect(await db().one("SELECT exdates FROM events")).toEqual({ exdates: [] });
  });
});

describe("020_imports", () => {
  it("D39 an import is staged, done or undone", async () => {
    await insertAccount("a1");

    const insert = (status: string) =>
      db().run(
        "INSERT INTO imports (id, account_id, status, file_name, bytes, first_day, last_day, created_at) VALUES ($1, 'a1', $1, 'a.ics', 1, '2026-10-09', '2026-10-09', $2)",
        [status, NOW],
      );

    await insert("staged");
    await expect(insert("lost")).rejects.toThrow(/check constraint/);
  });
});

describe("021_event_import_id", () => {
  it("D39 an event has no import unless it names one of the imports", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    expect(await db().one("SELECT import_id FROM events")).toEqual({ import_id: null });
    await expect(db().run("UPDATE events SET import_id = 'nope'")).rejects.toThrow(/foreign key/);
  });
});
