import { parseEnv } from "./env";

const BASE = {
  DATABASE_URL: "postgres://glance@localhost:5432/glance",
  APP_URL: "https://glance.example.com",
  RESEND_API_KEY: "re_123",
  MAIL_FROM: "Glance <hello@example.com>",
};

const VALID = { ...BASE, DATA_DIR: "/data" };

const S3 = {
  ...BASE,
  PHOTO_STORE: "s3",
  S3_BUCKET: "glance-photos",
  S3_REGION: "us-west-2",
  S3_ACCESS_KEY_ID: "AKID",
  S3_SECRET_ACCESS_KEY: "s3_secret",
};

const R2 = {
  ...BASE,
  PHOTO_STORE: "r2",
  R2_ACCOUNT_ID: "abc123",
  R2_BUCKET: "glance-photos",
  R2_ACCESS_KEY_ID: "r2key",
  R2_SECRET_ACCESS_KEY: "r2_secret",
};

describe("parseEnv", () => {
  it("tech§6.5 reads DATABASE_URL, APP_URL, RESEND_API_KEY, MAIL_FROM and a disk store at DATA_DIR by default", () => {
    expect(parseEnv({ ...VALID, OTHER: "x" })).toEqual({
      ...BASE,
      storage: { kind: "disk", dataDir: "/data" },
    });
  });

  it("tech§6.5 fails fast naming every missing variable", () => {
    expect(() => parseEnv({ APP_URL: VALID.APP_URL, MAIL_FROM: VALID.MAIL_FROM })).toThrow(
      "Invalid server config: DATABASE_URL, RESEND_API_KEY, DATA_DIR",
    );
  });

  it("tech§6.5 rejects a blank DATA_DIR, RESEND_API_KEY or MAIL_FROM", () => {
    expect(() => parseEnv({ ...VALID, DATA_DIR: "", RESEND_API_KEY: " ", MAIL_FROM: " " })).toThrow(
      "Invalid server config: RESEND_API_KEY, MAIL_FROM, DATA_DIR",
    );
  });

  it("tech§6.5 rejects a DATABASE_URL that isn't a postgres:// URL", () => {
    expect(() => parseEnv({ ...VALID, DATABASE_URL: "/var/lib/glance/glance.db" })).toThrow(
      "Invalid server config: DATABASE_URL",
    );
  });

  it("tech§6.5 rejects an APP_URL that isn't a URL", () => {
    expect(() => parseEnv({ ...VALID, APP_URL: "glance.example.com" })).toThrow(
      "Invalid server config: APP_URL",
    );
  });

  it("tech§6.5 doesn't echo the values, which may hold the Resend API key", () => {
    expect(() => parseEnv({ ...VALID, APP_URL: "re_secret", RESEND_API_KEY: "" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("re_secret") }),
    );
  });

  it("tech§6.5 PHOTO_STORE=s3 reads the S3 bucket without DATA_DIR", () => {
    expect(parseEnv(S3).storage).toEqual({
      kind: "s3",
      bucket: "glance-photos",
      region: "us-west-2",
      accessKeyId: "AKID",
      secretAccessKey: "s3_secret",
    });
  });

  it("tech§6.5 PHOTO_STORE=s3 takes an optional S3_ENDPOINT for S3-compatible hosts", () => {
    expect(parseEnv({ ...S3, S3_ENDPOINT: "https://minio.example.com" }).storage).toMatchObject({
      endpoint: "https://minio.example.com",
    });
  });

  it("tech§6.5 PHOTO_STORE=s3 names the missing S3 variables, not their values", () => {
    expect(() => parseEnv({ ...S3, S3_BUCKET: "", S3_SECRET_ACCESS_KEY: undefined })).toThrow(
      "Invalid server config: S3_BUCKET, S3_SECRET_ACCESS_KEY",
    );
  });

  it("tech§6.5 PHOTO_STORE=r2 reads the R2 account and bucket without DATA_DIR", () => {
    expect(parseEnv(R2).storage).toEqual({
      kind: "r2",
      accountId: "abc123",
      bucket: "glance-photos",
      accessKeyId: "r2key",
      secretAccessKey: "r2_secret",
    });
  });

  it("tech§6.5 PHOTO_STORE=r2 names the missing R2 variables", () => {
    expect(() => parseEnv({ ...R2, R2_ACCOUNT_ID: undefined })).toThrow(
      "Invalid server config: R2_ACCOUNT_ID",
    );
  });

  it("tech§6.5 rejects an unknown PHOTO_STORE", () => {
    expect(() => parseEnv({ ...VALID, PHOTO_STORE: "gcs" })).toThrow(
      "Invalid server config: PHOTO_STORE",
    );
  });
});
