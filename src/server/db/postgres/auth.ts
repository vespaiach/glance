import "server-only";
import type { Browser, DeviceKind } from "@/domain/screens";
import type {
  AccountRecord,
  DisplayRecord,
  MagicLinkRecord,
  Repos,
  SignInCodeRecord,
} from "../database";
import type { Sql } from "./sql";

const ERASE_ACCOUNT = [
  "DELETE FROM reminder_sends r USING events e WHERE e.id = r.event_id AND e.account_id = $1",
  "DELETE FROM events WHERE account_id = $1",
  "DELETE FROM imports WHERE account_id = $1",
  "DELETE FROM notes WHERE account_id = $1",
  "DELETE FROM tags WHERE account_id = $1",
  "DELETE FROM photos WHERE account_id = $1",
  "DELETE FROM settings WHERE account_id = $1",
  "DELETE FROM weather_cache WHERE account_id = $1",
  "DELETE FROM push_subscriptions WHERE account_id = $1",
  "DELETE FROM magic_links WHERE account_id = $1",
  "DELETE FROM accounts WHERE id = $1",
];

type AccountRow = {
  id: string;
  email: string;
  name: string | null;
  time_zone: string;
  setup_done_at: string | null;
  created_at: string;
};

type DisplayRow = {
  id: string;
  account_id: string;
  kind: DeviceKind;
  browser: Browser | null;
  last_seen_at: string;
};

type SessionRow = { display_id: string; account_id: string; created_at: string };

type CodeRow = {
  email: string;
  code_hash: string;
  time_zone: string;
  tries: number;
  expires_at: string;
};

type LinkRow = {
  token_hash: string;
  account_id: string;
  display_id: string;
  expires_at: string;
  used_at: string | null;
};

export function accountsRepo(sql: Sql): Repos["accounts"] {
  return {
    byId: async (id) => {
      const row = await sql.one<AccountRow>("SELECT * FROM accounts WHERE id = $1", [id]);

      return row && toAccount(row);
    },
    byEmail: async (email) => {
      const row = await sql.one<AccountRow>("SELECT * FROM accounts WHERE email = $1", [email]);

      return row && toAccount(row);
    },
    insert: async (account) => {
      await sql.run(
        "INSERT INTO accounts (id, email, name, time_zone, setup_done_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          account.id,
          account.email,
          account.name,
          account.timeZone,
          account.setupDoneAt,
          account.createdAt,
        ],
      );
    },
    rename: async (id, name) => {
      await sql.run("UPDATE accounts SET name = $1 WHERE id = $2", [name, id]);
    },
    finishSetup: async (id, at) => {
      await sql.run(
        "UPDATE accounts SET setup_done_at = $1 WHERE id = $2 AND setup_done_at IS NULL",
        [at, id],
      );
    },
    erase: async (id, at) => {
      const files = await sql.all<{ file_path: string }>(
        "INSERT INTO photo_file_cleanup (file_path, created_at) SELECT file_path, $2 FROM photos WHERE account_id = $1 AND NOT files_removed ON CONFLICT DO NOTHING RETURNING file_path",
        [id, at],
      );

      for (const statement of ERASE_ACCOUNT) await sql.run(statement, [id]);

      return files.map((row) => row.file_path);
    },
  };
}

export function displaysRepo(sql: Sql): Repos["displays"] {
  return {
    insert: async (display) => {
      await sql.run(
        "INSERT INTO displays (id, account_id, kind, browser, last_seen_at) VALUES ($1, $2, $3, $4, $5)",
        [display.id, display.accountId, display.kind, display.browser, display.lastSeenAt],
      );
    },
    forAccount: async (accountId) => {
      const rows = await sql.all<DisplayRow>(
        "SELECT id, account_id, kind, browser, last_seen_at FROM displays WHERE account_id = $1 ORDER BY id",
        [accountId],
      );

      return rows.map(toDisplay);
    },
    seen: async (id, at) => {
      await sql.run("UPDATE displays SET last_seen_at = $1 WHERE id = $2", [at, id]);
    },
    remove: async (id) => {
      await sql.run("DELETE FROM displays WHERE id = $1", [id]);
    },
    removeForAccount: async (accountId) => {
      await sql.run("DELETE FROM displays WHERE account_id = $1", [accountId]);
    },
  };
}

export function sessionsRepo(sql: Sql): Repos["sessions"] {
  return {
    insert: async (session) => {
      await sql.run(
        "INSERT INTO sessions (token_hash, display_id, created_at) VALUES ($1, $2, $3)",
        [session.tokenHash, session.displayId, session.createdAt],
      );
    },
    find: async (tokenHash) => {
      const row = await sql.one<SessionRow>(
        "SELECT s.display_id, d.account_id, s.created_at FROM sessions s JOIN displays d ON d.id = s.display_id WHERE s.token_hash = $1",
        [tokenHash],
      );

      return (
        row && { displayId: row.display_id, accountId: row.account_id, createdAt: row.created_at }
      );
    },
    removeForDisplay: async (displayId) => {
      await sql.run("DELETE FROM sessions WHERE display_id = $1", [displayId]);
    },
    revokeForAccount: async (accountId, at) => {
      await sql.run(
        "INSERT INTO revoked_sessions (token_hash, revoked_at) SELECT s.token_hash, $2 FROM sessions s JOIN displays d ON d.id = s.display_id WHERE d.account_id = $1",
        [accountId, at],
      );
      await sql.run(
        "DELETE FROM sessions s USING displays d WHERE d.id = s.display_id AND d.account_id = $1",
        [accountId],
      );
    },
    revoked: async (tokenHash) =>
      (await sql.one("SELECT 1 FROM revoked_sessions WHERE token_hash = $1", [tokenHash])) !==
      undefined,
    removeRevokedBefore: async (before) => {
      await sql.run("DELETE FROM revoked_sessions WHERE revoked_at < $1", [before]);
    },
  };
}

export function signInCodesRepo(sql: Sql): Repos["signInCodes"] {
  return {
    get: async (email) => {
      const row = await sql.one<CodeRow>("SELECT * FROM sign_in_codes WHERE email = $1", [email]);

      return row && toCode(row);
    },
    put: async (code) => {
      await sql.run(
        `INSERT INTO sign_in_codes (email, code_hash, time_zone, tries, expires_at) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET code_hash = $2, time_zone = $3, tries = $4, expires_at = $5`,
        [code.email, code.codeHash, code.timeZone, code.tries, code.expiresAt],
      );
    },
    remove: async (email) => {
      await sql.run("DELETE FROM sign_in_codes WHERE email = $1", [email]);
    },
    removeExpired: async (before) => {
      await sql.run("DELETE FROM sign_in_codes WHERE expires_at < $1", [before]);
    },
  };
}

export function magicLinksRepo(sql: Sql): Repos["magicLinks"] {
  return {
    get: async (tokenHash) => {
      const row = await sql.one<LinkRow>("SELECT * FROM magic_links WHERE token_hash = $1", [
        tokenHash,
      ]);

      return row && toLink(row);
    },
    insert: async (link) => {
      await sql.run(
        "INSERT INTO magic_links (token_hash, account_id, display_id, expires_at, used_at) VALUES ($1, $2, $3, $4, $5)",
        [link.tokenHash, link.accountId, link.displayId, link.expiresAt, link.usedAt],
      );
    },
    markUsed: async (tokenHash, at) => {
      await sql.run("UPDATE magic_links SET used_at = $1 WHERE token_hash = $2", [at, tokenHash]);
    },
    remove: async (tokenHash) => {
      await sql.run("DELETE FROM magic_links WHERE token_hash = $1", [tokenHash]);
    },
    removeUnusedFor: async (displayId) => {
      await sql.run("DELETE FROM magic_links WHERE display_id = $1 AND used_at IS NULL", [
        displayId,
      ]);
    },
    removeExpired: async (before) => {
      await sql.run("DELETE FROM magic_links WHERE expires_at < $1", [before]);
    },
  };
}

function toAccount(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    timeZone: row.time_zone,
    setupDoneAt: row.setup_done_at,
    createdAt: row.created_at,
  };
}

function toDisplay(row: DisplayRow): DisplayRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind,
    browser: row.browser,
    lastSeenAt: row.last_seen_at,
  };
}

function toCode(row: CodeRow): SignInCodeRecord {
  return {
    email: row.email,
    codeHash: row.code_hash,
    timeZone: row.time_zone,
    tries: row.tries,
    expiresAt: row.expires_at,
  };
}

function toLink(row: LinkRow): MagicLinkRecord {
  return {
    tokenHash: row.token_hash,
    accountId: row.account_id,
    displayId: row.display_id,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}
