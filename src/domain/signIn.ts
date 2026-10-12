const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim());
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
