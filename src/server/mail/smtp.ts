import "server-only";
import { ok } from "@/domain/result";
import { type Mailer, type MailMessage, mailFailed } from "./mailer";

export type SmtpMail = MailMessage & { from: string };

export type SmtpTransport = { sendMail(mail: SmtpMail): Promise<unknown> };

export function createSmtpMailer(transport: SmtpTransport, from: string): Mailer {
  return {
    async send(message) {
      try {
        await transport.sendMail({ from, ...message });

        return ok(undefined);
      } catch (error) {
        return mailFailed("smtp", error);
      }
    },
  };
}
