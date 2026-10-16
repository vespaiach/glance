import "server-only";
import pg from "pg";
import { env } from "../env";

export type Db = {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<number>;
  exec(sql: string): Promise<void>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
};

export type DbDriver = {
  query(sql: string, params: unknown[]): Promise<{ rows: unknown[]; count: number }>;
  exec(sql: string): Promise<unknown>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
};

const OID = { int8: 20, date: 1082, timestamptz: 1184 };

const UTC_OFFSET_HOURS = /([+-]\d{2})$/;

export const PG_PARSERS: Record<number, (value: string) => unknown> = {
  [OID.int8]: Number,
  [OID.date]: (value) => value,
  [OID.timestamptz]: isoTimestamp,
};

export const pgTypes = {
  getTypeParser: ((oid: number, format?: "text" | "binary") =>
    PG_PARSERS[oid] ?? pg.types.getTypeParser(oid, format)) as typeof pg.types.getTypeParser,
};

function isoTimestamp(value: string): string {
  const iso = value.replace(" ", "T").replace(UTC_OFFSET_HOURS, "$1:00");

  return new Date(iso).toISOString();
}

export function driverDb(driver: DbDriver): Db {
  return {
    all: async <T>(sql: string, params: unknown[] = []) =>
      (await driver.query(sql, params)).rows as T[],
    one: async <T>(sql: string, params: unknown[] = []) =>
      (await driver.query(sql, params)).rows[0] as T | undefined,
    run: async (sql, params = []) => (await driver.query(sql, params)).count,
    exec: async (sql) => {
      await driver.exec(sql);
    },
    tx: (fn) => driver.tx(fn),
  };
}

const shared = globalThis as typeof globalThis & { glanceDb?: Db };

export function getDb(): Db {
  shared.glanceDb ??= openPgDb(env().DATABASE_URL);

  return shared.glanceDb;
}

export function openPgDb(connectionString: string): Db {
  return pgDb(new pg.Pool({ connectionString, types: pgTypes }));
}

export function pgDb(pool: pg.Pool): Db {
  return driverDb({
    query: (sql, params) => pgQuery(pool, sql, params),
    exec: (sql) => pool.query(sql),
    tx: (fn) => pgTx(pool, fn),
  });
}

async function pgQuery(client: pg.Pool | pg.PoolClient, sql: string, params: unknown[]) {
  const result = await client.query(sql, params);

  return { rows: result.rows, count: result.rowCount ?? 0 };
}

async function pgTx<T>(pool: pg.Pool, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    return await inPgTx(client, fn);
  } finally {
    client.release();
  }
}

async function inPgTx<T>(client: pg.PoolClient, fn: (db: Db) => Promise<T>): Promise<T> {
  await client.query("BEGIN");

  try {
    const result = await fn(clientDb(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function clientDb(client: pg.PoolClient): Db {
  const db: Db = driverDb({
    query: (sql, params) => pgQuery(client, sql, params),
    exec: (sql) => client.query(sql),
    tx: (fn) => fn(db),
  });

  return db;
}
