import { QR_CODE_TTL_MS, qrSecondsLeft } from "./qrSignIn";

const ISSUED = "2026-10-09T17:41:00.000Z";

function later(ms: number): Date {
  return new Date(new Date(ISSUED).getTime() + ms);
}

describe("qrSecondsLeft", () => {
  it("SIGNIN-15 a code lasts 5 minutes", () => {
    expect(QR_CODE_TTL_MS).toBe(5 * 60 * 1000);
  });

  it("SIGNIN-15 counts down from 5:00 when the code arrives", () => {
    expect(qrSecondsLeft(ISSUED, later(0))).toBe(300);
  });

  it("SIGNIN-15 shows a started second until it ends", () => {
    expect(qrSecondsLeft(ISSUED, later(400))).toBe(300);
    expect(qrSecondsLeft(ISSUED, later(1000))).toBe(299);
    expect(qrSecondsLeft(ISSUED, later(295_500))).toBe(5);
  });

  it("SIGNIN-15 reaches 0 at 5 minutes and stays there", () => {
    expect(qrSecondsLeft(ISSUED, later(QR_CODE_TTL_MS))).toBe(0);
    expect(qrSecondsLeft(ISSUED, later(QR_CODE_TTL_MS + 5000))).toBe(0);
  });

  it("SIGNIN-15 a clock set back never shows more than 5:00", () => {
    expect(qrSecondsLeft(ISSUED, later(-60_000))).toBe(300);
  });
});
