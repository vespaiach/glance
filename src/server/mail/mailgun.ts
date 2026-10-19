import "server-only";
import { postMail } from "./http";
import type { Mailer, MailgunConfig, MailMessage } from "./mailer";

const HOSTS = { us: "https://api.mailgun.net", eu: "https://api.eu.mailgun.net" };

export function createMailgunMailer(
  config: MailgunConfig,
  from: string,
  fetchImpl: typeof fetch,
): Mailer {
  return {
    send: (message) =>
      postMail("mailgun", fetchImpl, {
        url: `${HOSTS[config.region]}/v3/${config.domain}/messages`,
        headers: { Authorization: `Basic ${btoa(`api:${config.apiKey}`)}` },
        body: formFields(from, message),
      }),
  };
}

function formFields(from: string, message: MailMessage): URLSearchParams {
  const fields = Object.entries({ from, ...message }).filter(
    (field): field is [string, string] => field[1] !== undefined,
  );

  return new URLSearchParams(fields);
}
