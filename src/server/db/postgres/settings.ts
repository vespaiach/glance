import "server-only";
import type { AccountSettings, Weather } from "@/domain/schemas";
import type { Repos, StoredSettings } from "../database";
import type { Sql } from "./sql";

type SettingsRow = {
  account_id: string;
  json: AccountSettings;
  updated_at: string;
  version: number;
};

type CacheRow = { location: string; json: string; fetched_at: string };

export function settingsRepo(sql: Sql): Repos["settings"] {
  return {
    get: async (accountId) => {
      const row = await sql.one<SettingsRow>("SELECT * FROM settings WHERE account_id = $1", [
        accountId,
      ]);

      return row && toSettings(row);
    },
    save: (settings) => saveSettings(sql, settings),
    all: async () => (await sql.all<SettingsRow>("SELECT * FROM settings")).map(toSettings),
    changedSince: async (accountId, version) => {
      const rows = await sql.all<SettingsRow>(
        "SELECT * FROM settings WHERE account_id = $1 AND version > $2",
        [accountId, version],
      );

      return rows.map(toSettings);
    },
  };
}

export function weatherCacheRepo(sql: Sql): Repos["weatherCache"] {
  return {
    get: async (accountId) => {
      const row = await sql.one<CacheRow>(
        "SELECT location, json, fetched_at FROM weather_cache WHERE account_id = $1",
        [accountId],
      );

      return (
        row && {
          location: row.location,
          weather: JSON.parse(row.json) as Weather,
          fetchedAt: row.fetched_at,
        }
      );
    },
    put: async (accountId, entry) => {
      await sql.run(
        `INSERT INTO weather_cache (account_id, location, json, fetched_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (account_id) DO UPDATE SET location = excluded.location, json = excluded.json,
           fetched_at = excluded.fetched_at`,
        [accountId, entry.location, JSON.stringify(entry.weather), entry.fetchedAt],
      );
    },
  };
}

function toSettings(row: SettingsRow): StoredSettings {
  return {
    ...row.json,
    accountId: row.account_id,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

async function saveSettings(
  sql: Sql,
  { accountId, updatedAt, version, ...settings }: StoredSettings,
): Promise<void> {
  await sql.run(
    `INSERT INTO settings (account_id, json, updated_at, version) VALUES ($1, $2, $3, $4)
     ON CONFLICT (account_id) DO UPDATE SET json = excluded.json,
       updated_at = excluded.updated_at, version = excluded.version`,
    [accountId, JSON.stringify(settings), updatedAt, version],
  );
}
