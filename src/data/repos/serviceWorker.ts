import { SW_URL, WARM_PHOTOS } from "../sw/rules";

export const UPDATE_CHECK_MS = 60 * 60_000;

const SKIP_WAITING = { type: "SKIP_WAITING" };

export type AppServiceWorker = {
  register(): void;
  updateWaiting(): boolean;
  checkForUpdate(): void;
  applyUpdate(then: () => void): void;
  warmPhotos(ids: string[]): void;
};

const INERT: AppServiceWorker = {
  register: () => {},
  updateWaiting: () => false,
  checkForUpdate: () => {},
  applyUpdate: () => {},
  warmPhotos: () => {},
};

let shared: AppServiceWorker | undefined;

export function createAppServiceWorker(
  container: ServiceWorkerContainer | undefined,
): AppServiceWorker {
  if (container === undefined) return INERT;

  let registration: ServiceWorkerRegistration | undefined;

  let registering = false;

  let applying = false;

  const checkForUpdate = () => {
    registration?.update().catch(() => {});
  };

  const registered = (found: ServiceWorkerRegistration) => {
    registration = found;

    setInterval(checkForUpdate, UPDATE_CHECK_MS);
  };

  return {
    register: () => {
      if (registering) return;

      registering = true;

      const options: RegistrationOptions = { scope: "/", type: "classic", updateViaCache: "none" };

      container.register(SW_URL, options).then(registered, () => {});
    },
    updateWaiting: () => Boolean(registration?.waiting),
    checkForUpdate,
    applyUpdate: (then) => {
      const waiting = registration?.waiting;

      if (applying || !waiting) return;

      applying = true;

      container.addEventListener("controllerchange", then, { once: true });

      waiting.postMessage(SKIP_WAITING);
    },
    warmPhotos: (ids) => {
      container.ready.then((ready) => ready.active?.postMessage({ type: WARM_PHOTOS, ids }));
    },
  };
}

export function appServiceWorker(): AppServiceWorker {
  shared ??= createAppServiceWorker(serviceWorkerContainer());

  return shared;
}

export function serviceWorkerContainer(): ServiceWorkerContainer | undefined {
  if (process.env.NODE_ENV === "development") return undefined;

  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined;

  return navigator.serviceWorker;
}
