import "server-only";
import nodemailer from "nodemailer";
import { copy } from "@/copy";
import { err, ok, type Result } from "@/domain/result";

export type MailMessage = { to: string; subject: string; text: string };

export type Mailer = { send(message: MailMessage): Promise<Result<void, "mail-failed">> };

type TransportConfig = Parameters<typeof nodemailer.createTransport>[0];

export function createMailer(transport: TransportConfig, from: string): Mailer {
  const transporter = nodemailer.createTransport(transport, { from });

  return {
    send: async (message) => {
      try {
        await transporter.sendMail(message);

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
