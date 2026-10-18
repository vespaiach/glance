const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const normalEmail = (email: string) => email.trim().toLowerCase();

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}

export function isSwitchingEmail(previous: string, draft: string, pending: number): boolean {
  if (pending === 0 || normalEmail(draft) === "") return false;

  return normalEmail(draft) !== normalEmail(previous);
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
