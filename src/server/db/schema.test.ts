import { MIGRATIONS_DIR, migrate, readMigrations } from "./migrate";
import { openPglite, pgliteDb } from "./pglite";
import { migratedDbPerTest } from "./testDb";

const db = migratedDbPerTest();

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
    "INSERT INTO notes (id, account_id, text, tone, rotation, created_at, updated_at, version) VALUES ('n1', 'a1', 'Hi', 'yellow', 1.5, $1, $1, 1)",
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
      "magic_links",
      "members",
      "notes",
      "photos",
      "schema_migrations",
      "sessions",
      "settings",
      "sign_in_codes",
      "sync_state",
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
    const old = pgliteDb(client);
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
    const old = pgliteDb(client);
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

async function insertMember(id: string, name: string, color = "lilac"): Promise<void> {
  await db().run(
    "INSERT INTO members (id, account_id, name, color, created_at, updated_at, version) VALUES ($1, 'a1', $2, $3, $4, $4, 1)",
    [id, name, color, NOW],
  );
}

describe("007_members", () => {
  it("D24 an event is for everyone with no members, no notes and no tone", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    expect(await db().one("SELECT * FROM events")).toMatchObject({
      everyone: true,
      member_ids: [],
      notes: null,
    });
    expect(await db().one("SELECT * FROM events")).not.toHaveProperty("tone");
  });

  it("D24 stores an event's member ids as an array", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    await db().run("UPDATE events SET everyone = false, member_ids = $1", [["m1", "m2"]]);

    expect(await db().one("SELECT member_ids FROM events")).toEqual({ member_ids: ["m1", "m2"] });
  });

  it("D24 rejects an everyone event that also names members", async () => {
    await insertAccount("a1");
    await insertEvent(NOW, null);

    await expect(db().run("UPDATE events SET member_ids = $1", [["m1"]])).rejects.toThrow(
      /check constraint/,
    );
  });

  it("§7 rejects a member color outside the 12 block colors", async () => {
    await insertAccount("a1");

    await expect(insertMember("m1", "Mom", "navy")).rejects.toThrow(/check constraint/);
  });

  it("FAM-04 rejects a second live member with the same name in another case", async () => {
    await insertAccount("a1");
    await insertMember("m1", "Mom");

    await expect(insertMember("m2", "MOM")).rejects.toThrow(/unique constraint/);

    await db().run("UPDATE members SET deleted_at = $1", [NOW]);

    await expect(insertMember("m2", "MOM")).resolves.toBeUndefined();
  });

  it("D24 gives each named account one lilac member and turns old events into everyone events", async () => {
    const client = await openPglite();
    const old = pgliteDb(client);
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

    await migrate(old, migrations);

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
