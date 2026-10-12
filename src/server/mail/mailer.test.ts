import { createMailer, signInMessage } from "./mailer";

describe("createMailer", () => {
  it("D14 sends from MAIL_FROM through the transport", async () => {
    const mailer = createMailer({ jsonTransport: true }, "Glance <hello@example.com>");

    const result = await mailer.send({ to: "maria@example.com", subject: "Hi", text: "Body" });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("D14 reports a transport failure without throwing", async () => {
    const mailer = createMailer("smtp://127.0.0.1:1", "Glance <hello@example.com>");

    const result = await mailer.send({ to: "maria@example.com", subject: "Hi", text: "Body" });

    expect(result).toEqual({ ok: false, error: "mail-failed" });
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
