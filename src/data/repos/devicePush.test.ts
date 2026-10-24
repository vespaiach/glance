import { err, ok } from "@/domain/result";
import type { Transport } from "../sync/transport";
import { createDevicePush, type DevicePushDeps } from "./devicePush";

const SUBSCRIPTION = {
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "p256", auth: "secret" },
};

function fakeSubscription() {
  return { toJSON: () => SUBSCRIPTION, unsubscribe: vi.fn(async () => true) };
}

function setup(options: { permission?: NotificationPermission; existing?: boolean } = {}) {
  const current = options.existing ? fakeSubscription() : null;

  const created = fakeSubscription();

  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => created),
  };

  const webPush = {
    key: vi.fn<Transport["webPush"]["key"]>(async () => ok("BPublicKey")),
    subscribe: vi.fn<Transport["webPush"]["subscribe"]>(async () => ok(undefined)),
    unsubscribe: vi.fn<Transport["webPush"]["unsubscribe"]>(async () => ok(undefined)),
  };

  let permission = options.permission ?? "default";

  const requestPermission = vi.fn(async () => permission);

  const deps: DevicePushDeps = {
    ready: () => Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration),
    permission: () => permission,
    requestPermission,
    webPush,
  };

  const answerPrompt = (answer: NotificationPermission) => {
    permission = answer;
  };

  return { device: createDevicePush(deps), pushManager, webPush, current, created, answerPrompt };
}

describe("createDevicePush", () => {
  it("NOTIF-08 is unsupported without a service worker or Notification", async () => {
    const device = createDevicePush(undefined);

    expect(await device.check()).toEqual({
      supported: false,
      permission: "default",
      subscribed: false,
    });
  });

  it("NOTIF-08 is unsupported when the server has push off", async () => {
    const { device, webPush } = setup();

    webPush.key.mockResolvedValue(err("invalid"));

    expect((await device.check()).supported).toBe(false);
  });

  it("NOTIF-08 check reads the permission and this device's subscription", async () => {
    const { device } = setup({ permission: "granted", existing: true });

    expect(await device.check()).toEqual({
      supported: true,
      permission: "granted",
      subscribed: true,
    });
  });

  it("NOTIF-08 allow asks, subscribes with the server key and saves the subscription", async () => {
    const { device, pushManager, webPush, answerPrompt } = setup();

    answerPrompt("granted");

    expect(await device.allow()).toBe("allowed");
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: "BPublicKey",
    });
    expect(webPush.subscribe).toHaveBeenCalledWith(SUBSCRIPTION);
  });

  it("NOTIF-08 allow answers blocked when the prompt is denied", async () => {
    const { device, pushManager, answerPrompt } = setup();

    answerPrompt("denied");

    expect(await device.allow()).toBe("blocked");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("NOTIF-08 allow drops the browser subscription when the server refuses it", async () => {
    const { device, webPush, created, answerPrompt } = setup();

    answerPrompt("granted");
    webPush.subscribe.mockResolvedValue(err("network"));

    expect(await device.allow()).toBe("failed");
    expect(created.unsubscribe).toHaveBeenCalled();
  });

  it("NOTIF-08 turnOff unsubscribes the browser and deletes the server row", async () => {
    const { device, webPush, current } = setup({ permission: "granted", existing: true });

    await device.turnOff();

    expect(current?.unsubscribe).toHaveBeenCalled();
    expect(webPush.unsubscribe).toHaveBeenCalled();
  });
});
