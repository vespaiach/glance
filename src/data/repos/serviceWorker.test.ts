import { SW_URL, WARM_PHOTOS } from "../sw/rules";
import { createAppServiceWorker, createDevServiceWorker, UPDATE_CHECK_MS } from "./serviceWorker";

function fakeWorker() {
  return { postMessage: vi.fn() } as unknown as ServiceWorker & {
    postMessage: ReturnType<typeof vi.fn>;
  };
}

function fakeContainer() {
  const registration = {
    active: fakeWorker() as ServiceWorker | null,
    waiting: null as ServiceWorker | null,
    update: vi.fn(async () => {}),
  };

  const events = new EventTarget();

  const container = {
    register: vi.fn(async () => registration),
    ready: Promise.resolve(registration),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };

  const takeOver = () => events.dispatchEvent(new Event("controllerchange"));

  return {
    container: container as unknown as ServiceWorkerContainer,
    register: container.register,
    registration,
    takeOver,
  };
}

async function registered() {
  const fake = fakeContainer();

  const sw = createAppServiceWorker(fake.container, load);

  sw.register();

  await vi.waitFor(() => expect(fake.register).toHaveBeenCalled());

  await Promise.resolve();

  return { ...fake, sw };
}

const load = vi.fn<(path: string) => void>();

afterEach(() => {
  vi.useRealTimers();
  load.mockReset();
});

describe("registration", () => {
  it("D16 registers the app's worker once, for the whole site, as a classic script", async () => {
    const { sw, register } = await registered();

    sw.register();

    expect(register).toHaveBeenCalledExactlyOnceWith(SW_URL, {
      scope: "/",
      type: "classic",
      updateViaCache: "none",
    });
  });

  it("OFF-07 looks for a new version every hour", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    const { registration } = await registered();

    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_MS);

    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("D16 in development unregisters a worker a production build left behind", async () => {
    const leftover = { unregister: vi.fn(async () => true) };

    const container = {
      register: vi.fn(),
      getRegistrations: vi.fn(async () => [leftover]),
    } as unknown as ServiceWorkerContainer;

    createDevServiceWorker(container).register();

    await vi.waitFor(() => expect(leftover.unregister).toHaveBeenCalledTimes(1));

    expect(container.register).not.toHaveBeenCalled();
  });

  it("D16 without service worker support every call does nothing", () => {
    const sw = createAppServiceWorker(undefined);

    sw.register();
    sw.checkForUpdate();
    sw.warmPhotos(["p1"]);

    expect(sw.updateWaiting()).toBe(false);
  });
});

describe("updates", () => {
  it("OFF-07 reports a new version waiting to take over", async () => {
    const { sw, registration } = await registered();

    expect(sw.updateWaiting()).toBe(false);

    registration.waiting = fakeWorker();

    expect(sw.updateWaiting()).toBe(true);
  });

  it("OFF-07 checkForUpdate asks the browser for a new version", async () => {
    const { sw, registration } = await registered();

    sw.checkForUpdate();

    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("OFF-07 applying tells the waiting version to take over and reloads once it controls the page", async () => {
    const { sw, registration, takeOver } = await registered();

    const waiting = fakeWorker();

    registration.waiting = waiting;

    const reload = vi.fn();

    sw.applyUpdate(reload);
    sw.applyUpdate(reload);

    expect(waiting.postMessage).toHaveBeenCalledExactlyOnceWith({ type: "SKIP_WAITING" });
    expect(reload).not.toHaveBeenCalled();

    takeOver();
    takeOver();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("reload", () => {
  it("SET-21 asks for a new version, applies the waiting one, then loads the page", async () => {
    const { sw, registration, takeOver } = await registered();

    const waiting = fakeWorker();

    registration.update.mockImplementation(async () => {
      registration.waiting = waiting;
    });

    sw.reload("/today");

    await vi.waitFor(() =>
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" }),
    );
    expect(load).not.toHaveBeenCalled();

    takeOver();

    expect(load).toHaveBeenCalledExactlyOnceWith("/today");
  });

  it("SET-21 without a new version it loads the page from the server", async () => {
    const { sw } = await registered();

    sw.reload("/today");

    await vi.waitFor(() => expect(load).toHaveBeenCalledExactlyOnceWith("/today"));
  });

  it("SET-21 without service worker support it still loads the page", () => {
    createAppServiceWorker(undefined, load).reload("/today");

    expect(load).toHaveBeenCalledExactlyOnceWith("/today");
  });
});

describe("photo warming", () => {
  it("tech§4.5 warmPhotos hands the ids to the active worker", async () => {
    const { sw, registration } = await registered();

    sw.warmPhotos(["p1", "p2"]);

    await vi.waitFor(() =>
      expect(registration.active?.postMessage).toHaveBeenCalledWith({
        type: WARM_PHOTOS,
        ids: ["p1", "p2"],
      }),
    );
  });
});
