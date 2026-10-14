import { createMailer, signInMessage } from "./mailer";

const MESSAGE = { to: "maria@example.com", subject: "Hi", text: "Body" };

describe("createMailer", () => {
  it("D14 posts the message from MAIL_FROM to Resend with the API key", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: "email-1" }));
    const mailer = createMailer("re_test", "Glance <hello@example.com>", fetcher);

    const result = await mailer.send(MESSAGE);

    expect(result).toEqual({ ok: true, value: undefined });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer re_test");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "Glance <hello@example.com>",
      ...MESSAGE,
    });
  });

  it("D14 reports a Resend error response without throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ message: "Invalid `from` field" }, { status: 422 }),
    );
    const mailer = createMailer("re_test", "Glance <hello@example.com>", fetcher);

    const result = await mailer.send(MESSAGE);

    expect(result).toEqual({ ok: false, error: "mail-failed" });
  });

  it("D14 reports a network failure without throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const mailer = createMailer("re_test", "Glance <hello@example.com>", fetcher);

    const result = await mailer.send(MESSAGE);

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
