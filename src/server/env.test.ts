import { parseEnv } from "./env";

const VALID = {
  DATA_DIR: "/data",
  APP_URL: "https://glance.example.com",
  SMTP_URL: "smtps://user:pass@smtp.example.com:465",
  MAIL_FROM: "Glance <hello@example.com>",
};

describe("parseEnv", () => {
  it("tech§6.5 reads DATA_DIR, APP_URL, SMTP_URL and MAIL_FROM", () => {
    expect(parseEnv({ ...VALID, OTHER: "x" })).toEqual(VALID);
  });

  it("tech§6.5 fails fast naming every missing variable", () => {
    expect(() => parseEnv({ APP_URL: VALID.APP_URL, MAIL_FROM: VALID.MAIL_FROM })).toThrow(
      "Invalid server config: DATA_DIR, SMTP_URL",
    );
  });

  it("tech§6.5 rejects a blank DATA_DIR or MAIL_FROM", () => {
    expect(() => parseEnv({ ...VALID, DATA_DIR: "", MAIL_FROM: " " })).toThrow(
      "Invalid server config: DATA_DIR, MAIL_FROM",
    );
  });

  it("tech§6.5 rejects an APP_URL or SMTP_URL that isn't a URL", () => {
    expect(() => parseEnv({ ...VALID, APP_URL: "glance.example.com", SMTP_URL: "smtp" })).toThrow(
      "Invalid server config: APP_URL, SMTP_URL",
    );
  });

  it("tech§6.5 doesn't echo the values, which may hold the SMTP password", () => {
    expect(() => parseEnv({ ...VALID, APP_URL: "secret-pass" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secret-pass") }),
    );
  });
});
