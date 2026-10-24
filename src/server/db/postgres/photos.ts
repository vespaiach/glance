import "server-only";
import type { PhotoSources } from "@/domain/schemas";
import type { Repos, StoredPhoto } from "../database";
import { optional, type ServerColumns, serverFields } from "./rows";
import type { Sql } from "./sql";

type PhotoRow = ServerColumns & {
  id: string;
  title: string;
  taken_on: string | null;
  place: string | null;
  created_at: string;
  title_source: PhotoSources["title"];
  date_source: PhotoSources["takenOn"];
  place_source: PhotoSources["place"];
  checked: boolean;
  file_name: string | null;
};

export function photosRepo(sql: Sql): Repos["photos"] {
  return {
    find: async (accountId, id) => {
      const row = await sql.one<PhotoRow>(
        "SELECT * FROM photos WHERE id = $1 AND account_id = $2",
        [id, accountId],
      );

      return row && toPhoto(row);
    },
    insert: (accountId, photo, filePath) => insertPhoto(sql, accountId, photo, filePath),
    save: (accountId, photo) => savePhoto(sql, accountId, photo),
    livePath: async (accountId, id) => {
      const row = await sql.one<{ file_path: string }>(
        "SELECT file_path FROM photos WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL",
        [id, accountId],
      );

      return row?.file_path;
    },
    livePaths: async () => {
      const rows = await sql.all<{ file_path: string }>(
        "SELECT file_path FROM photos WHERE deleted_at IS NULL",
      );

      return rows.map((row) => row.file_path);
    },
    deletedPaths: async () => {
      const rows = await sql.all<{ file_path: string }>(
        "SELECT file_path FROM photos WHERE deleted_at IS NOT NULL AND NOT files_removed",
      );

      return rows.map((row) => row.file_path);
    },
    filesRemoved: async (filePath) => {
      await sql.run("UPDATE photos SET files_removed = true WHERE file_path = $1", [filePath]);
    },
    changedSince: async (accountId, version) => {
      const rows = await sql.all<PhotoRow>(
        "SELECT * FROM photos WHERE account_id = $1 AND version > $2 ORDER BY version",
        [accountId, version],
      );

      return rows.map(toPhoto);
    },
  };
}

function toPhoto(row: PhotoRow): StoredPhoto {
  return {
    id: row.id,
    title: row.title,
    ...optional("takenOn", row.taken_on),
    ...optional("place", row.place),
    createdAt: row.created_at,
    sources: { title: row.title_source, takenOn: row.date_source, place: row.place_source },
    checked: row.checked,
    ...optional("fileName", row.file_name),
    ...serverFields(row),
  };
}

async function insertPhoto(
  sql: Sql,
  accountId: string,
  photo: StoredPhoto,
  filePath: string,
): Promise<void> {
  await sql.run(
    `INSERT INTO photos (id, account_id, title, taken_on, place, file_path, created_at, updated_at,
       deleted_at, version, title_source, date_source, place_source, checked, file_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      photo.id,
      accountId,
      photo.title,
      photo.takenOn ?? null,
      photo.place ?? null,
      filePath,
      photo.createdAt,
      photo.updatedAt,
      photo.deletedAt ?? null,
      photo.version,
      photo.sources.title,
      photo.sources.takenOn,
      photo.sources.place,
      photo.checked,
      photo.fileName ?? null,
    ],
  );
}

async function savePhoto(sql: Sql, accountId: string, photo: StoredPhoto): Promise<void> {
  await sql.run(
    `UPDATE photos SET title = $1, taken_on = $2, place = $3, title_source = $4, date_source = $5,
       place_source = $6, checked = $7, file_name = $8, updated_at = $9, deleted_at = $10,
       version = $11
     WHERE id = $12 AND account_id = $13`,
    [
      photo.title,
      photo.takenOn ?? null,
      photo.place ?? null,
      photo.sources.title,
      photo.sources.takenOn,
      photo.sources.place,
      photo.checked,
      photo.fileName ?? null,
      photo.updatedAt,
      photo.deletedAt ?? null,
      photo.version,
      photo.id,
      accountId,
    ],
  );
}
