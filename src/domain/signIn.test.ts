import { firstName, isSwitchingEmail, isValidEmail } from "./signIn";

describe("sign-in rules", () => {
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
