import "server-only";
import * as v from "valibot";
import { type MailConfig, parseAddress } from "./mail/mailer";
import type { PhotoStoreConfig } from "./storage/store";

const POSTGRES_URL = /^postgres(ql)?:\/\//;

const PORT = /^\d{1,5}$/;

const SMTP_CREDENTIALS = [["SMTP_USER"], ["SMTP_PASSWORD"]] as const;

const Filled = v.pipe(v.string(), v.trim(), v.nonEmpty());

const BaseSchema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.trim(), v.regex(POSTGRES_URL)),
  APP_URL: v.pipe(v.string(), v.url()),
  MAIL_FROM: v.pipe(
    Filled,
    v.check((from) => parseAddress(from) !== undefined),
  ),
});

const SmtpSchema = v.pipe(
  v.object({
    MAIL_PROVIDER: v.literal("smtp"),
    SMTP_HOST: Filled,
    SMTP_PORT: v.optional(v.pipe(v.string(), v.trim(), v.regex(PORT), v.transform(Number)), "587"),
    SMTP_SECURE: v.optional(v.picklist(["true", "false"]), "false"),
    SMTP_USER: v.optional(Filled),
    SMTP_PASSWORD: v.optional(Filled),
  }),
  v.forward(v.partialCheck(SMTP_CREDENTIALS, credentialsPaired), ["SMTP_USER"]),
  v.forward(v.partialCheck(SMTP_CREDENTIALS, credentialsPaired), ["SMTP_PASSWORD"]),
  v.transform(
    (source): MailConfig => ({
      provider: "smtp",
      host: source.SMTP_HOST,
      port: source.SMTP_PORT,
      secure: source.SMTP_SECURE === "true",
      ...(source.SMTP_USER &&
        source.SMTP_PASSWORD && {
          auth: { user: source.SMTP_USER, password: source.SMTP_PASSWORD },
        }),
    }),
  ),
);

const MailSchema = v.variant("MAIL_PROVIDER", [
  v.pipe(
    v.object({ MAIL_PROVIDER: v.optional(v.literal("resend")), RESEND_API_KEY: Filled }),
    v.transform((source): MailConfig => ({ provider: "resend", apiKey: source.RESEND_API_KEY })),
  ),
  v.pipe(
    v.object({
      MAIL_PROVIDER: v.literal("mailtrap"),
      MAILTRAP_API_TOKEN: Filled,
      MAILTRAP_INBOX_ID: v.optional(Filled),
    }),
    v.transform(
      (source): MailConfig => ({
        provider: "mailtrap",
        apiToken: source.MAILTRAP_API_TOKEN,
        ...(source.MAILTRAP_INBOX_ID && { inboxId: source.MAILTRAP_INBOX_ID }),
      }),
    ),
  ),
  v.pipe(
    v.object({
      MAIL_PROVIDER: v.literal("mailgun"),
      MAILGUN_API_KEY: Filled,
      MAILGUN_DOMAIN: Filled,
      MAILGUN_REGION: v.optional(v.picklist(["us", "eu"]), "us"),
    }),
    v.transform(
      (source): MailConfig => ({
        provider: "mailgun",
        apiKey: source.MAILGUN_API_KEY,
        domain: source.MAILGUN_DOMAIN,
        region: source.MAILGUN_REGION,
      }),
    ),
  ),
  SmtpSchema,
]);

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

export type Env = v.InferOutput<typeof BaseSchema> & {
  mail: MailConfig;
  storage: PhotoStoreConfig;
};

let cached: Env | undefined;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const base = v.safeParse(BaseSchema, source);

  const mail = v.safeParse(MailSchema, source);

  const storage = v.safeParse(StorageSchema, source);

  if (!base.success || !mail.success || !storage.success) {
    throw new Error(`Invalid server config: ${invalidKeys([base, mail, storage]).join(", ")}`);
  }

  return { ...base.output, mail: mail.output, storage: storage.output };
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

function credentialsPaired(input: { SMTP_USER?: string; SMTP_PASSWORD?: string }): boolean {
  return (input.SMTP_USER === undefined) === (input.SMTP_PASSWORD === undefined);
}
