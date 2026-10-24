import { useMemo } from "react";
import type { PushSubscription } from "@/domain/schemas";
import type { Transport } from "../sync/transport";
import { serviceWorkerContainer } from "./serviceWorker";
import { useRepoStore } from "./store";

export type DevicePushDeps = {
  ready: () => Promise<ServiceWorkerRegistration>;
  permission: () => NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  webPush: Transport["webPush"];
};

export type PushCheck = {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
};

export type AllowAnswer = "allowed" | "blocked" | "failed";

export type DevicePush = {
  check(): Promise<PushCheck>;
  allow(): Promise<AllowAnswer>;
  turnOff(): Promise<void>;
};

const UNSUPPORTED: PushCheck = { supported: false, permission: "default", subscribed: false };

export function createDevicePush(deps: DevicePushDeps | undefined): DevicePush {
  if (deps === undefined) {
    return { check: async () => UNSUPPORTED, allow: async () => "failed", turnOff: async () => {} };
  }

  return {
    check: () => check(deps),
    allow: () => allow(deps),
    turnOff: async () => {
      const current = await currentSubscription(deps);

      await current?.unsubscribe().catch(() => false);

      await deps.webPush.unsubscribe();
    },
  };
}

export function useDevicePush(): DevicePush {
  const { webPush } = useRepoStore();

  return useMemo(() => createDevicePush(browserPush(webPush)), [webPush]);
}

async function check(deps: DevicePushDeps): Promise<PushCheck> {
  const key = await deps.webPush.key();

  if (!key.ok) return UNSUPPORTED;

  const current = await currentSubscription(deps);

  return { supported: true, permission: deps.permission(), subscribed: current !== null };
}

async function allow(deps: DevicePushDeps): Promise<AllowAnswer> {
  const permission = await deps.requestPermission();

  if (permission === "denied") return "blocked";

  if (permission !== "granted") return "failed";

  const key = await deps.webPush.key();

  if (!key.ok) return "failed";

  const created = await subscribe(deps, key.value);

  if (created === null) return "failed";

  const saved = await saveSubscription(deps, created);

  return saved ? "allowed" : "failed";
}

async function subscribe(
  deps: DevicePushDeps,
  key: string,
): Promise<globalThis.PushSubscription | null> {
  const { pushManager } = await deps.ready();

  return pushManager
    .subscribe({ userVisibleOnly: true, applicationServerKey: key })
    .catch(() => null);
}

async function saveSubscription(
  deps: DevicePushDeps,
  created: globalThis.PushSubscription,
): Promise<boolean> {
  const subscription = subscriptionOf(created.toJSON());

  const answer = subscription ? await deps.webPush.subscribe(subscription) : undefined;

  if (answer?.ok) return true;

  await created.unsubscribe().catch(() => false);

  return false;
}

async function currentSubscription(
  deps: DevicePushDeps,
): Promise<globalThis.PushSubscription | null> {
  const { pushManager } = await deps.ready();

  return pushManager.getSubscription().catch(() => null);
}

function subscriptionOf(json: PushSubscriptionJSON): PushSubscription | undefined {
  const { endpoint, keys } = json;

  if (!endpoint || !keys?.p256dh || !keys.auth) return undefined;

  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

function browserPush(webPush: Transport["webPush"]): DevicePushDeps | undefined {
  const container = serviceWorkerContainer();

  if (!container || typeof Notification === "undefined" || !("PushManager" in window)) {
    return undefined;
  }

  return {
    ready: () => container.ready,
    permission: () => Notification.permission,
    requestPermission: () => Notification.requestPermission(),
    webPush,
  };
}
