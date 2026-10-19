import "server-only";
import { postMail } from "./http";
import type { Mailer, ResendConfig } from "./mailer";

const RESEND_URL = "https://api.resend.com/emails";

export function createResendMailer(
  config: ResendConfig,
  from: string,
  fetchImpl: typeof fetch,
): Mailer {
  return {
    send: (message) =>
      postMail("resend", fetchImpl, {
        url: RESEND_URL,
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, ...message }),
      }),
  };
}
