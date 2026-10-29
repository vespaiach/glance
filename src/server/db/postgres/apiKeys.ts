import "server-only";
import type { ApiKeyRecord, Repos } from "../database";
import type { Sql } from "./sql";

type ApiKeyRow = {
  account_id: string;
  key_hash: string;
  tail: string;
  created_at: string;
  last_used_at: string | null;
};

export function apiKeysRepo(sql: Sql): Repos["apiKeys"] {
  return {
    insert: async (key) =>
      (await sql.run(
        `INSERT INTO api_keys (account_id, key_hash, tail, created_at, last_used_at)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (account_id) DO NOTHING`,
        [key.accountId, key.keyHash, key.tail, key.createdAt, key.lastUsedAt],
      )) > 0,
    get: async (accountId) => {
      const row = await sql.one<ApiKeyRow>("SELECT * FROM api_keys WHERE account_id = $1", [
        accountId,
      ]);

      return row && toApiKey(row);
    },
    remove: async (accountId) =>
      (await sql.run("DELETE FROM api_keys WHERE account_id = $1", [accountId])) > 0,
  };
}

function toApiKey(row: ApiKeyRow): ApiKeyRecord {
  return {
    accountId: row.account_id,
    keyHash: row.key_hash,
    tail: row.tail,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}
