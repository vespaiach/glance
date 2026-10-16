import type { PGlite } from "@electric-sql/pglite";
import { type Db, pgTypes } from "./db";
import { openPglite, pgliteDb } from "./pglite";

const TIMESTAMPTZ = 1184;

const INT8 = 20;

const DATE = 1082;

let client: PGlite;

let db: Db;

beforeEach(async () => {
  client = await openPglite();
  db = pgliteDb(client);
  await db.exec("CREATE TABLE t (id integer PRIMARY KEY, name text NOT NULL)");
  await db.exec("INSERT INTO t VALUES (1, 'a'), (2, 'b'), (3, 'c')");
});

afterEach(async () => {
  await client.close();
});

async function names(): Promise<string[]> {
  const rows = await db.all<{ name: string }>("SELECT name FROM t ORDER BY id");

  return rows.map((row) => row.name);
}

describe("pgliteDb", () => {
  it("D7 all returns every matching row with $n parameters", async () => {
    const rows = await db.all("SELECT id, name FROM t WHERE id > $1 ORDER BY id", [1]);

    expect(rows).toEqual([
      { id: 2, name: "b" },
      { id: 3, name: "c" },
    ]);
  });

  it("D7 one returns the first row, or undefined when none match", async () => {
    expect(await db.one("SELECT name FROM t WHERE id = $1", [2])).toEqual({ name: "b" });
    expect(await db.one("SELECT name FROM t WHERE id = $1", [9])).toBeUndefined();
  });

  it("D7 run returns the number of rows it changed", async () => {
    expect(await db.run("UPDATE t SET name = 'x' WHERE id < $1", [3])).toBe(2);
    expect(await db.run("DELETE FROM t WHERE id = $1", [9])).toBe(0);
  });

  it("D7 tx commits when its function resolves", async () => {
    const result = await db.tx(async (tx) => {
      await tx.run("DELETE FROM t WHERE id = $1", [1]);

      return "done";
    });

    expect(result).toBe("done");
    expect(await names()).toEqual(["b", "c"]);
  });

  it("D7 tx rolls back every write when its function throws", async () => {
    const failing = db.tx(async (tx) => {
      await tx.run("DELETE FROM t WHERE id = $1", [1]);
      throw new Error("boom");
    });

    await expect(failing).rejects.toThrow("boom");
    expect(await names()).toEqual(["a", "b", "c"]);
  });

  it("D7 reads timestamptz as an ISO string, bigint as a number and date as YYYY-MM-DD", async () => {
    const row = await db.one(
      "SELECT '2026-10-09T14:00:00.123Z'::timestamptz AS at, 9007199254740991::bigint AS n, '2026-10-09'::date AS d",
    );

    expect(row).toEqual({ at: "2026-10-09T14:00:00.123Z", n: 9007199254740991, d: "2026-10-09" });
  });

  it("D7 reads a timestamptz as UTC whatever the session time zone", async () => {
    await db.exec("SET TIME ZONE 'Asia/Kolkata'");

    const row = await db.one("SELECT '2026-10-09T14:00:00Z'::timestamptz AS at");

    expect(row).toEqual({ at: "2026-10-09T14:00:00.000Z" });
  });
});

describe("pgTypes", () => {
  it("D7 parses timestamptz text to an ISO string", () => {
    const parse = pgTypes.getTypeParser(TIMESTAMPTZ, "text");

    expect(parse("2026-10-09 19:30:00.5+05:30")).toBe("2026-10-09T14:00:00.500Z");
    expect(parse("2026-10-09 14:00:00+00")).toBe("2026-10-09T14:00:00.000Z");
  });

  it("D7 parses bigint text to a number", () => {
    expect(pgTypes.getTypeParser(INT8, "text")("42")).toBe(42);
  });

  it("D7 keeps a date as its YYYY-MM-DD text", () => {
    expect(pgTypes.getTypeParser(DATE, "text")("2026-10-09")).toBe("2026-10-09");
  });
});
