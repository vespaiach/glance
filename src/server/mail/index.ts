import "server-only";
import { createTransport } from "nodemailer";
import { env } from "../env";
import type { MailConfig, Mailer, SmtpConfig } from "./mailer";
import { createMailgunMailer } from "./mailgun";
import { createMailtrapMailer } from "./mailtrap";
import { createResendMailer } from "./resend";
import { createSmtpMailer, type SmtpTransport } from "./smtp";

export type { MailConfig, Mailer, MailMessage } from "./mailer";

let shared: Mailer | undefined;

export function createMailer(
  config: MailConfig,
  from: string,
  fetchImpl: typeof fetch = fetch,
): Mailer {
  switch (config.provider) {
    case "resend":
      return createResendMailer(config, from, fetchImpl);
    case "mailtrap":
      return createMailtrapMailer(config, from, fetchImpl);
    case "mailgun":
      return createMailgunMailer(config, from, fetchImpl);
    case "smtp":
      return createSmtpMailer(smtpTransport(config), from);
  }
}

export function mailer(): Mailer {
  shared ??= createMailer(env().mail, env().MAIL_FROM);

  return shared;
}

function smtpTransport({ host, port, secure, auth }: SmtpConfig): SmtpTransport {
  return createTransport({
    host,
    port,
    secure,
    ...(auth && { auth: { user: auth.user, pass: auth.password } }),
  });
}
