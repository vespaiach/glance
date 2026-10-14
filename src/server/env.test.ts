import { parseEnv } from "./env";

const VALID = {
  DATA_DIR: "/data",
  APP_URL: "https://glance.example.com",
  RESEND_API_KEY: "re_123",
  MAIL_FROM: "Glance <hello@example.com>",
};

describe("parseEnv", () => {
  it("tech§6.5 reads DATA_DIR, APP_URL, RESEND_API_KEY and MAIL_FROM", () => {
    expect(parseEnv({ ...VALID, OTHER: "x" })).toEqual(VALID);
  });

  it("tech§6.5 fails fast naming every missing variable", () => {
    expect(() => parseEnv({ APP_URL: VALID.APP_URL, MAIL_FROM: VALID.MAIL_FROM })).toThrow(
      "Invalid server config: DATA_DIR, RESEND_API_KEY",
    );
  });

  it("tech§6.5 rejects a blank DATA_DIR, RESEND_API_KEY or MAIL_FROM", () => {
    expect(() => parseEnv({ ...VALID, DATA_DIR: "", RESEND_API_KEY: " ", MAIL_FROM: " " })).toThrow(
      "Invalid server config: DATA_DIR, RESEND_API_KEY, MAIL_FROM",
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
});
