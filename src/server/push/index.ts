import "server-only";
import { sendNotification, WebPushError } from "web-push";
import { err, ok, type Result } from "@/domain/result";
import { logError } from "../log";

export type PushConfig = { publicKey: string; privateKey: string; subject: string };

export type PushTarget = { endpoint: string; keys: { p256dh: string; auth: string } };

export type PushMessage = { title: string; body: string; data: { url: string } };

export type PushError = "gone" | "failed";

export type PushSender = (
  target: PushTarget,
  message: PushMessage,
) => Promise<Result<void, PushError>>;

const GONE = new Set([404, 410]);

const TTL_S = 15 * 60;

export function createWebPush(config: PushConfig): PushSender {
  const vapidDetails = {
    subject: config.subject,
    publicKey: config.publicKey,
    privateKey: config.privateKey,
  };

  return async (target, message) => {
    try {
      await sendNotification(target, JSON.stringify(message), { vapidDetails, TTL: TTL_S });

      return ok(undefined);
    } catch (error) {
      if (isGone(error)) return err("gone");

      logError("push", "send-failed", error, statusOf(error));

      return err("failed");
    }
  };
}

function isGone(error: unknown): boolean {
  return error instanceof WebPushError && GONE.has(error.statusCode);
}

function statusOf(error: unknown): { status?: number } {
  return error instanceof WebPushError ? { status: error.statusCode } : {};
}
