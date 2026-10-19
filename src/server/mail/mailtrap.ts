import "server-only";
import { postMail } from "./http";
import { type Mailer, type MailMessage, type MailtrapConfig, parseAddress } from "./mailer";

const SEND_URL = "https://send.api.mailtrap.io/api/send";

const SANDBOX_URL = "https://sandbox.api.mailtrap.io/api/send";

export function createMailtrapMailer(
  config: MailtrapConfig,
  from: string,
  fetchImpl: typeof fetch,
): Mailer {
  return {
    send: (message) =>
      postMail("mailtrap", fetchImpl, {
        url: config.inboxId ? `${SANDBOX_URL}/${config.inboxId}` : SEND_URL,
        headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(mailtrapBody(from, message)),
      }),
  };
}

function mailtrapBody(from: string, { to, ...content }: MailMessage) {
  return { from: parseAddress(from) ?? { email: from }, to: [{ email: to }], ...content };
}
