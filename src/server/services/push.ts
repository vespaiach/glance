import "server-only";
import { uuidv7 } from "@/domain/id";
import type { PushSubscription } from "@/domain/schemas";
import type { ServiceDeps } from "./deps";

export async function subscribePush(
  { db, now }: ServiceDeps,
  accountId: string,
  displayId: string,
  subscription: PushSubscription,
): Promise<void> {
  const at = now();

  await db.tx((tx) =>
    tx.pushSubscriptions.save({
      id: uuidv7(at),
      accountId,
      displayId,
      ...subscription,
      createdAt: at.toISOString(),
    }),
  );
}

export async function unsubscribePush(
  { db }: ServiceDeps,
  accountId: string,
  displayId: string,
): Promise<void> {
  await db.pushSubscriptions.removeForDisplay(accountId, displayId);
}
