import "server-only";
import { copy } from "@/copy";
import { err, ok, type Result } from "@/domain/result";

export type MailMessage = { to: string; subject: string; text: string };

export type Mailer = { send(message: MailMessage): Promise<Result<void, "mail-failed">> };

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export function createMailer(apiKey: string, from: string, fetcher: typeof fetch = fetch): Mailer {
  return {
    send: async (message) => {
      try {
        const response = await fetcher(RESEND_EMAILS_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, ...message }),
        });

        if (!response.ok) {
          console.error(`Resend answered ${response.status}: ${await response.text()}`);

          return err("mail-failed");
        }

        return ok(undefined);
      } catch (error) {
        console.error(error);

        return err("mail-failed");
      }
    },
  };
}

export function signInMessage(to: string, url: string): MailMessage {
  return { to, subject: copy.signIn.email.subject, text: copy.signIn.email.body(url) };
}
