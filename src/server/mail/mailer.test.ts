import { parseAddress, signInMessage } from "./mailer";

describe("parseAddress", () => {
  it("tech§6.2 splits a Name <address> sender", () => {
    expect(parseAddress("Glance <hello@example.com>")).toEqual({
      email: "hello@example.com",
      name: "Glance",
    });
  });

  it("tech§6.2 reads a bare address without a name", () => {
    expect(parseAddress(" hello@example.com ")).toEqual({ email: "hello@example.com" });
  });

  it("tech§6.5 rejects a sender without an address", () => {
    expect(parseAddress("Glance")).toBeUndefined();
    expect(parseAddress("Glance <hello>")).toBeUndefined();
  });
});

describe("signInMessage", () => {
  it("SIGNIN-12 holds the link and says it works once, for 10 minutes", () => {
    const message = signInMessage(
      "maria@example.com",
      "https://glance.example.com/api/auth/verify?t=abc",
    );

    expect(message.to).toBe("maria@example.com");
    expect(message.subject).toBe("Your Glance sign-in link");
    expect(message.text).toContain("https://glance.example.com/api/auth/verify?t=abc");
    expect(message.text).toContain("works once, for 10 minutes");
  });
});
