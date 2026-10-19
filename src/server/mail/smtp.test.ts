import { type MailOutcome, MESSAGE, mailerContract } from "./contract";
import { createSmtpMailer, type SmtpMail, type SmtpTransport } from "./smtp";

const FROM = "Glance <hello@example.com>";

describe("createSmtpMailer", () => {
  mailerContract(() => {
    const fake = fakeTransport();

    return { mailer: createSmtpMailer(fake.transport, FROM), answer: fake.answer };
  });

  it("tech§6.2 hands the transport the message from MAIL_FROM", async () => {
    const fake = fakeTransport();

    await createSmtpMailer(fake.transport, FROM).send(MESSAGE);

    expect(fake.sent).toEqual([{ from: FROM, ...MESSAGE }]);
  });
});

function fakeTransport() {
  const sent: SmtpMail[] = [];

  let outcome: MailOutcome = "accepted";

  const transport: SmtpTransport = {
    sendMail: async (mail) => {
      if (outcome === "unreachable") throw new Error("connect ECONNREFUSED 127.0.0.1:1025");

      if (outcome === "rejected") throw new Error("Message failed: 550 mailbox unavailable");

      sent.push(mail);

      return { messageId: "<1@localhost>" };
    },
  };

  return {
    transport,
    sent,
    answer: (next: MailOutcome) => {
      outcome = next;
    },
  };
}
