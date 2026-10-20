const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const DIFFERENT_EMAIL_WAIT_S = 10;

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
