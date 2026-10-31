import { openPush, showPush } from "./push";

const PAYLOAD = {
  title: "Soccer practice in 15 min",
  body: "3:30 PM · Ana · Field 4",
  data: { url: "/today?event=0195f0a0-0000-7000-8000-000000000001" },
};

type FakeWindow = {
  visibilityState: DocumentVisibilityState;
  focus: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
};

function fakeWindow(visibilityState: DocumentVisibilityState): FakeWindow {
  const window: FakeWindow = {
    visibilityState,
    focus: vi.fn(async () => window),
    navigate: vi.fn(async () => window),
  };

  return window;
}

function fakeScope(windows: FakeWindow[]) {
  const clients = {
    matchAll: vi.fn(async () => windows),
    openWindow: vi.fn(async () => null),
  };

  const registration = { showNotification: vi.fn(async () => {}) };

  return { clients, registration } as unknown as ServiceWorkerGlobalScope & {
    clients: typeof clients;
    registration: typeof registration;
  };
}

describe("showPush", () => {
  it("NOTIF-07 shows the notification even when a Glance window is visible", async () => {
    const scope = fakeScope([fakeWindow("hidden"), fakeWindow("visible")]);

    await showPush(scope, PAYLOAD);

    expect(scope.registration.showNotification).toHaveBeenCalledWith(
      PAYLOAD.title,
      expect.objectContaining({ body: PAYLOAD.body, data: PAYLOAD.data }),
    );
  });

  it("NOTIF-07 shows the title, body and url when every window is hidden or closed", async () => {
    const scope = fakeScope([fakeWindow("hidden")]);

    await showPush(scope, PAYLOAD);

    expect(scope.registration.showNotification).toHaveBeenCalledWith(
      PAYLOAD.title,
      expect.objectContaining({ body: PAYLOAD.body, data: PAYLOAD.data }),
    );
  });

  it("NOTIF-07 drops a payload whose url leaves Glance", async () => {
    const scope = fakeScope([]);

    await showPush(scope, { ...PAYLOAD, data: { url: "https://evil.example.com" } });
    await showPush(scope, { ...PAYLOAD, data: { url: "//evil.example.com" } });
    await showPush(scope, { ...PAYLOAD, data: { url: "/\\evil.example.com" } });
    await showPush(scope, "not json");

    expect(scope.registration.showNotification).not.toHaveBeenCalled();
  });
});

describe("openPush", () => {
  it("NOTIF-07 a tap focuses an open Glance window and opens the url in it", async () => {
    const open = fakeWindow("hidden");
    const scope = fakeScope([open]);

    await openPush(scope.clients, PAYLOAD.data);

    expect(open.focus).toHaveBeenCalled();
    expect(open.navigate).toHaveBeenCalledWith(PAYLOAD.data.url);
    expect(scope.clients.openWindow).not.toHaveBeenCalled();
  });

  it("NOTIF-07 a tap opens Glance at the url when no window is open", async () => {
    const scope = fakeScope([]);

    await openPush(scope.clients, { url: "/today?at=15:30" });

    expect(scope.clients.openWindow).toHaveBeenCalledWith("/today?at=15:30");
  });

  it("NOTIF-07 a tap with a foreign url opens Today", async () => {
    const scope = fakeScope([]);

    await openPush(scope.clients, { url: "https://evil.example.com" });

    expect(scope.clients.openWindow).toHaveBeenCalledWith("/today");
  });
});
