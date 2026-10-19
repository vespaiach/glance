import { createTransport } from "nodemailer";
import { fakeFetch, MESSAGE } from "./contract";
import { createMailer } from "./index";

vi.mock("nodemailer", () => ({
  createTransport: vi.fn(() => ({ sendMail: vi.fn(async () => ({ messageId: "<1@localhost>" })) })),
}));

const FROM = "Glance <hello@example.com>";

describe("createMailer", () => {
  it.each([
    ["resend", { provider: "resend", apiKey: "re_test" }, "https://api.resend.com/emails"],
    [
      "mailtrap",
      { provider: "mailtrap", apiToken: "mt_test" },
      "https://send.api.mailtrap.io/api/send",
    ],
    [
      "mailgun",
      { provider: "mailgun", apiKey: "key-test", domain: "mg.example.com", region: "eu" },
      "https://api.eu.mailgun.net/v3/mg.example.com/messages",
    ],
  ] as const)("D14 %s reaches its HTTP API", async (_name, config, url) => {
    const fake = fakeFetch();

    const result = await createMailer(config, FROM, fake.fetch).send(MESSAGE);

    expect(result.ok).toBe(true);
    expect(fake.requests[0]?.url).toBe(url);
  });

  it("D14 smtp sends through a nodemailer transport built from the SMTP config", async () => {
    const mailer = createMailer(
      {
        provider: "smtp",
        host: "smtp.example.com",
        port: 465,
        secure: true,
        auth: { user: "glance", password: "smtp_secret" },
      },
      FROM,
    );

    const result = await mailer.send(MESSAGE);

    expect(result.ok).toBe(true);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { user: "glance", pass: "smtp_secret" },
    });
    const transport = vi.mocked(createTransport).mock.results[0]?.value;
    expect(transport.sendMail).toHaveBeenCalledWith({ from: FROM, ...MESSAGE });
  });

  it("D14 smtp without credentials builds a transport without auth", () => {
    vi.mocked(createTransport).mockClear();

    createMailer({ provider: "smtp", host: "localhost", port: 1025, secure: false }, FROM);

    expect(createTransport).toHaveBeenCalledWith({ host: "localhost", port: 1025, secure: false });
  });
});
