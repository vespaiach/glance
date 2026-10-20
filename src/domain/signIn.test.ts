import { differentEmailIn, firstName, isSwitchingEmail, isValidEmail } from "./signIn";

const SENT_AT = new Date("2026-10-09T17:41:00Z");

const after = (ms: number) => new Date(SENT_AT.getTime() + ms);

describe("sign-in rules", () => {
  it.each([
    [0, 10],
    [500, 10],
    [1_000, 9],
    [2_400, 8],
    [9_999, 1],
    [10_000, 0],
    [60_000, 0],
    [-3_000, 10],
  ])("SIGNIN-04 %i ms after the send, Use a different email is %i s away", (ms, seconds) => {
    expect(differentEmailIn(SENT_AT, after(ms))).toBe(seconds);
  });

  it.each(["maria@example.com", "a.b+c@mail.example.org", "  maria@example.com  "])(
    "SIGNIN-02 accepts %j as name@domain.tld",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each([
    "",
    "maria",
    "maria@",
    "maria@example",
    "@example.com",
    "ma ria@example.com",
    "maria@example.",
  ])("SIGNIN-02 rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("SIGNIN-09 the first name is the first word of the name", () => {
    expect(firstName("  Maria  Lopez ")).toBe("Maria");
  });

  it("SIGNIN-09 a one-word name is the first name", () => {
    expect(firstName("Maria")).toBe("Maria");
  });
});

describe("isSwitchingEmail", () => {
  it("SIGNIN-13 another email with changes waiting is a switch", () => {
    expect(isSwitchingEmail("maria@example.com", "sam.lee@example.com", 3)).toBe(true);
  });

  it("SIGNIN-13 the same email in another case or with spaces is not a switch", () => {
    expect(isSwitchingEmail("maria@example.com", "  Maria@Example.com ", 3)).toBe(false);
  });

  it("SIGNIN-13 with nothing waiting another email is not a switch", () => {
    expect(isSwitchingEmail("maria@example.com", "sam.lee@example.com", 0)).toBe(false);
  });

  it("SIGNIN-13 an empty field is not a switch", () => {
    expect(isSwitchingEmail("maria@example.com", "  ", 3)).toBe(false);
  });
});
