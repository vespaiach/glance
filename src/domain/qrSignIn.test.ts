import { linkToken, QR_CODE_TTL_MS, qrSecondsLeft } from "./qrSignIn";

const ISSUED = "2026-10-09T17:41:00.000Z";

function later(ms: number): Date {
  return new Date(new Date(ISSUED).getTime() + ms);
}

describe("qrSecondsLeft", () => {
  it("SIGNIN-15 a code lasts 3 minutes", () => {
    expect(QR_CODE_TTL_MS).toBe(3 * 60 * 1000);
  });

  it("SIGNIN-15 counts down from 3:00 when the code arrives", () => {
    expect(qrSecondsLeft(ISSUED, later(0))).toBe(180);
  });

  it("SIGNIN-15 shows a started second until it ends", () => {
    expect(qrSecondsLeft(ISSUED, later(400))).toBe(180);
    expect(qrSecondsLeft(ISSUED, later(1000))).toBe(179);
    expect(qrSecondsLeft(ISSUED, later(175_500))).toBe(5);
  });

  it("SIGNIN-15 reaches 0 at 3 minutes and stays there", () => {
    expect(qrSecondsLeft(ISSUED, later(QR_CODE_TTL_MS))).toBe(0);
    expect(qrSecondsLeft(ISSUED, later(QR_CODE_TTL_MS + 5000))).toBe(0);
  });

  it("SIGNIN-15 a clock set back never shows more than 3:00", () => {
    expect(qrSecondsLeft(ISSUED, later(-60_000))).toBe(180);
  });
});

describe("linkToken", () => {
  const ORIGIN = "https://glance.example.com";

  it("SIGNIN-22 reads the token of this origin's verify link", () => {
    expect(linkToken(`${ORIGIN}/api/auth/verify?t=abc123`, ORIGIN)).toBe("abc123");
    expect(linkToken(`${ORIGIN}/api/auth/verify?t=abc123&to=photos`, ORIGIN)).toBe("abc123");
  });

  it.each([
    ["another origin", "https://evil.example.com/api/auth/verify?t=abc123"],
    ["another path", `${ORIGIN}/signin?t=abc123`],
    ["no token", `${ORIGIN}/api/auth/verify`],
    ["an empty token", `${ORIGIN}/api/auth/verify?t=`],
    ["plain text", "Hello"],
  ])("SIGNIN-22 rejects %s", (_, text) => {
    expect(linkToken(text, ORIGIN)).toBeUndefined();
  });
});
