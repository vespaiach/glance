import "server-only";
import { copy } from "@/copy";
import { err, type Result } from "@/domain/result";
import type { Season } from "@/domain/schemas";
import { signInHtml } from "./signInHtml";

export type MailMessage = { to: string; subject: string; text: string; html?: string };

export type MailResult = Result<void, "mail-failed">;

export type Mailer = { send(message: MailMessage): Promise<MailResult> };

export type MailAddress = { email: string; name?: string };

export type ResendConfig = { apiKey: string };

export type MailtrapConfig = { apiToken: string; inboxId?: string };

export type MailgunConfig = { apiKey: string; domain: string; region: "us" | "eu" };

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; password: string };
};

export type MailConfig =
  | ({ provider: "resend" } & ResendConfig)
  | ({ provider: "mailtrap" } & MailtrapConfig)
  | ({ provider: "mailgun" } & MailgunConfig)
  | ({ provider: "smtp" } & SmtpConfig);

const NAMED_ADDRESS = /^(.*?)\s*<([^\s<>@]+@[^\s<>@]+)>$/;

const BARE_ADDRESS = /^[^\s<>@]+@[^\s<>@]+$/;

export function parseAddress(sender: string): MailAddress | undefined {
  const trimmed = sender.trim();

  const named = NAMED_ADDRESS.exec(trimmed);

  if (named?.[2]) return named[1] ? { email: named[2], name: named[1] } : { email: named[2] };

  return BARE_ADDRESS.test(trimmed) ? { email: trimmed } : undefined;
}

export function mailFailed(provider: string, reason: string): MailResult {
  console.error(`Mail via ${provider} failed: ${reason}`);

  return err("mail-failed");
}

export function signInMessage(to: string, code: string, season: Season): MailMessage {
  return {
    to,
    subject: copy.signIn.email.subject,
    text: signInText(to, code),
    html: signInHtml(to, code, season),
  };
}

function signInText(to: string, code: string): string {
  const t = copy.signIn.email;

  return [
    t.title,
    t.body,
    code,
    t.expires,
    t.warning,
    `${t.ignoreTitle} ${t.ignoreBody}`,
    `${t.sentToBefore}${to}${t.sentToAfter}\n${t.tagline}`,
  ].join("\n\n");
}
