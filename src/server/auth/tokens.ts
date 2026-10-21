import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;

const CODE_DIGITS = 6;

export function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newCode(): string {
  return String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, "0");
}

export function hashCode(email: string, code: string): string {
  return hashToken(`${email}:${code}`);
}

export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");

  const right = Buffer.from(b, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}
