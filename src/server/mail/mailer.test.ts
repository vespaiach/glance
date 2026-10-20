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

const URL_ = "https://glance.example.com/api/auth/verify?t=abc";

const COLORS = {
  spring: ["#dceeb1", "#f4ecd6"],
  summer: ["#f6e3a1", "#f4ecd6"],
  fall: ["#f0c987", "#f4ecd6"],
  winter: ["#d5e4f1", "#e9edf3"],
} as const;

describe("signInMessage", () => {
  it("SIGNIN-12 is sent to the address with the sign-in subject", () => {
    const message = signInMessage("maria@example.com", URL_, "spring");

    expect(message.to).toBe("maria@example.com");
    expect(message.subject).toBe("Your Glance sign-in link");
  });

  it("SIGNIN-12 html has the Sign in button and the raw link", () => {
    const { html } = signInMessage("maria@example.com", URL_, "spring");

    expect(html).toContain(`<a href="${URL_}" target="_blank" style="display:block;`);
    expect(html).toContain(">Sign in</a>");
    expect(html).toContain(`>${URL_}</a>`);
    expect(html).toContain("Button not working? Copy this link into your browser:");
    expect(html).toContain("Tap to sign in. The link works once, for 10 minutes.");
    expect(html).toContain('<a href="mailto:maria@example.com"');
    expect(html).not.toContain("{{");
  });

  it("SIGNIN-12 html escapes the URL and the email", () => {
    const { html } = signInMessage('a"<b>@example.com', 'https://x.test/?a=1&b="<i>', "spring");

    expect(html).toContain("https://x.test/?a=1&amp;b=&quot;&lt;i&gt;");
    expect(html).toContain("a&quot;&lt;b&gt;@example.com");
    expect(html).not.toContain("<i>");
    expect(html).not.toContain("<b>");
  });

  it.each(Object.entries(COLORS))(
    "SIGNIN-12 html uses the %s hero and page colors",
    (season, [hero, page]) => {
      const { html } = signInMessage("maria@example.com", URL_, season as keyof typeof COLORS);

      expect(html).toContain(`class="hero" bgcolor="${hero}" style="background-color:${hero};`);
      expect(html).toContain(`<body style="margin:0;padding:0;background-color:${page};">`);
      expect(html).toContain(
        `class="page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${page}"`,
      );
    },
  );

  it("SIGNIN-12 the text part has the same words and the link", () => {
    const { text } = signInMessage("maria@example.com", URL_, "fall");

    for (const words of [
      "Sign in to Glance",
      "Tap the button and the screen that asked for this link signs in by itself. New here? The same link sets up your family’s Glance.",
      URL_,
      "Works once, for 10 minutes",
      "Didn’t ask for this? You can ignore this email. No one can sign in unless this link is opened.",
      "Sent to maria@example.com because it was entered on a Glance screen.",
      "Glance · Calendar, weather, notes and photos for your family.",
    ]) {
      expect(text).toContain(words);
    }
  });
});
