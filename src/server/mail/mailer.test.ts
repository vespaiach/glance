import { spyOnLoggedErrors } from "../testLog";
import { mailFailed, parseAddress, signInMessage } from "./mailer";

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

const CODE = "048291";

const COLORS = {
  spring: ["#dceeb1", "#f4ecd6"],
  summer: ["#f6e3a1", "#f4ecd6"],
  fall: ["#f0c987", "#f4ecd6"],
  winter: ["#d5e4f1", "#e9edf3"],
} as const;

describe("signInMessage", () => {
  it("SIGNIN-12 is sent to the address with the sign-in code subject", () => {
    const message = signInMessage("maria@example.com", CODE, "spring");

    expect(message.to).toBe("maria@example.com");
    expect(message.subject).toBe("Your Glance sign-in code");
  });

  it("SIGNIN-12 html shows the code in its tile and the preheader, with no link or button", () => {
    const { html } = signInMessage("maria@example.com", CODE, "spring");

    expect(html).toContain(
      `letter-spacing:10px;color:#000000;mso-line-height-rule:exactly;">${CODE}</td>`,
    );
    expect(html).toContain(`${CODE} is your Glance code. It works once, for 10 minutes.`);
    expect(html).toContain(">Your sign-in code</td>");
    expect(html).toContain(
      "Glance never asks for this code by phone, text or email. Only type it on your Glance screen.",
    );
    expect(html).toContain('<a href="mailto:maria@example.com"');
    expect(html).not.toMatch(/href="http/);
    expect(html).not.toContain("{{");
  });

  it("SIGNIN-12 html escapes the email", () => {
    const { html } = signInMessage('a"<b>@example.com', CODE, "spring");

    expect(html).toContain("a&quot;&lt;b&gt;@example.com");
    expect(html).not.toContain("<b>");
  });

  it.each(Object.entries(COLORS))(
    "SIGNIN-12 html uses the %s hero and page colors",
    (season, [hero, page]) => {
      const { html } = signInMessage("maria@example.com", CODE, season as keyof typeof COLORS);

      expect(html).toContain(`class="hero" bgcolor="${hero}" style="background-color:${hero};`);
      expect(html).toContain(`<body style="margin:0;padding:0;background-color:${page};">`);
      expect(html).toContain(
        `class="page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${page}"`,
      );
    },
  );

  it("SIGNIN-12 the text part has the same words and the code", () => {
    const { text } = signInMessage("maria@example.com", CODE, "fall");

    for (const words of [
      "Your sign-in code",
      "Enter this code on the Glance screen that asked for it. New here? The same code sets up your family’s Glance.",
      CODE,
      "Works once, for 10 minutes",
      "Glance never asks for this code by phone, text or email. Only type it on your Glance screen.",
      "Didn’t ask for this? You can ignore this email. No one can sign in without this code.",
      "Sent to maria@example.com because it was entered on a Glance screen.",
      "Glance · Calendar, weather, notes and photos for your family.",
    ]) {
      expect(text).toContain(words);
    }
    expect(text).not.toContain("http");
  });
});

describe("mailFailed", () => {
  it("tech§6.6 logs the provider and the status, and answers mail-failed", () => {
    const logged = spyOnLoggedErrors();

    expect(mailFailed("resend", new Error("status 422"), 422)).toEqual({
      ok: false,
      error: "mail-failed",
    });
    expect(logged()).toMatchObject([
      {
        source: "mail",
        event: "send-failed",
        provider: "resend",
        status: 422,
        error: { message: "status 422" },
      },
    ]);
  });

  it("tech§6.6 masks the recipient an SMTP error names", () => {
    const logged = spyOnLoggedErrors();

    mailFailed("smtp", new Error("550 5.1.1 <maria@example.com>: Recipient address rejected"));

    expect(JSON.stringify(logged())).not.toContain("maria@example.com");
  });
});
