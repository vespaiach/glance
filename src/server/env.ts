import "server-only";
import * as v from "valibot";
import type { PhotoStoreConfig } from "./storage/store";

const POSTGRES_URL = /^postgres(ql)?:\/\//;

const Filled = v.pipe(v.string(), v.trim(), v.nonEmpty());

const BaseSchema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.trim(), v.regex(POSTGRES_URL)),
  APP_URL: v.pipe(v.string(), v.url()),
  RESEND_API_KEY: Filled,
  MAIL_FROM: Filled,
});

const StorageSchema = v.variant("PHOTO_STORE", [
  v.pipe(
    v.object({ PHOTO_STORE: v.optional(v.literal("disk")), DATA_DIR: Filled }),
    v.transform((source): PhotoStoreConfig => ({ kind: "disk", dataDir: source.DATA_DIR })),
  ),
  v.pipe(
    v.object({
      PHOTO_STORE: v.literal("s3"),
      S3_BUCKET: Filled,
      S3_REGION: Filled,
      S3_ACCESS_KEY_ID: Filled,
      S3_SECRET_ACCESS_KEY: Filled,
      S3_ENDPOINT: v.optional(v.pipe(v.string(), v.url())),
    }),
    v.transform(
      (source): PhotoStoreConfig => ({
        kind: "s3",
        bucket: source.S3_BUCKET,
        region: source.S3_REGION,
        accessKeyId: source.S3_ACCESS_KEY_ID,
        secretAccessKey: source.S3_SECRET_ACCESS_KEY,
        ...(source.S3_ENDPOINT && { endpoint: source.S3_ENDPOINT }),
      }),
    ),
  ),
  v.pipe(
    v.object({
      PHOTO_STORE: v.literal("r2"),
      R2_ACCOUNT_ID: Filled,
      R2_BUCKET: Filled,
      R2_ACCESS_KEY_ID: Filled,
      R2_SECRET_ACCESS_KEY: Filled,
    }),
    v.transform(
      (source): PhotoStoreConfig => ({
        kind: "r2",
        accountId: source.R2_ACCOUNT_ID,
        bucket: source.R2_BUCKET,
        accessKeyId: source.R2_ACCESS_KEY_ID,
        secretAccessKey: source.R2_SECRET_ACCESS_KEY,
      }),
    ),
  ),
]);

export type Env = v.InferOutput<typeof BaseSchema> & { storage: PhotoStoreConfig };

let cached: Env | undefined;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const base = v.safeParse(BaseSchema, source);

  const storage = v.safeParse(StorageSchema, source);

  if (!base.success || !storage.success) {
    throw new Error(`Invalid server config: ${invalidKeys([base, storage]).join(", ")}`);
  }

  return { ...base.output, storage: storage.output };
}

export function env(): Env {
  cached ??= parseEnv(process.env);

  return cached;
}

function invalidKeys(results: { issues?: v.GenericIssue[] | undefined }[]): string[] {
  const keys = results.flatMap(({ issues = [] }) =>
    issues.map((issue) => v.getDotPath(issue) ?? ""),
  );

  return [...new Set(keys)];
}
