const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const DIFFERENT_EMAIL_WAIT_S = 10;

export const CODE_LENGTH = 6;

const CODE_LIFETIME_MS = 10 * 60_000;

const normalEmail = (email: string) => email.trim().toLowerCase();

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}

export function isSwitchingEmail(previous: string, draft: string, pending: number): boolean {
  if (pending === 0 || normalEmail(draft) === "") return false;

  return normalEmail(draft) !== normalEmail(previous);
}

export function differentEmailIn(sentAt: Date, now: Date): number {
  const elapsed = Math.max(0, now.getTime() - sentAt.getTime());

  return Math.max(0, Math.ceil(DIFFERENT_EMAIL_WAIT_S - elapsed / 1_000));
}

export function codeDigits(text: string): string {
  return text.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function codeExpired(sentAt: Date, now: Date): boolean {
  return now.getTime() - sentAt.getTime() >= CODE_LIFETIME_MS;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });

    return true;
  } catch {
    return false;
  }
}
