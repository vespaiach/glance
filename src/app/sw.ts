/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  type PrecacheEntry,
  Serwist,
  type SerwistGlobalConfig,
  type SerwistPlugin,
} from "serwist";
import { createErrorReporter } from "@/data/sw/errors";
import { openPush, showPush } from "@/data/sw/push";
import {
  CACHES,
  FALLBACK_PAGE,
  isPhotoFile,
  isRscRequest,
  isWarmPhotos,
  NETWORK_TIMEOUT_SECONDS,
  OFFLINE_PAGES,
  PHOTO_CACHE_ENTRIES,
  pageCacheKey,
  photoFileUrls,
  rscCacheKey,
} from "@/data/sw/rules";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const ASSET_CACHE_ENTRIES = 256;

const RSC_CACHE_ENTRIES = 64;

const byPath: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => pageCacheKey(new URL(request.url)),
};

const byRscSegment: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => rscCacheKey(request),
};

const fallBackToToday: SerwistPlugin = {
  handlerDidError: async () => (await caches.open(CACHES.pages)).match(FALLBACK_PAGE),
};

const keepRequestUrl: SerwistPlugin = {
  cachedResponseWillBeUsed: async ({ cachedResponse }) =>
    cachedResponse && new Response(cachedResponse.body, cachedResponse),
};

const photos = new CacheFirst({
  cacheName: CACHES.photos,
  plugins: [new ExpirationPlugin({ maxEntries: PHOTO_CACHE_ENTRIES })],
});

const report = createErrorReporter({ events: self });

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true, plugins: [keepRequestUrl] },
  skipWaiting: false,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && isPhotoFile(url),
      handler: photos,
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }) => isRscRequest(request, new URL(self.location.origin)),
      handler: new NetworkFirst({
        cacheName: CACHES.rsc,
        networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
        plugins: [byRscSegment, new ExpirationPlugin({ maxEntries: RSC_CACHE_ENTRIES })],
      }),
    },
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: CACHES.pages,
        networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
        plugins: [byPath, fallBackToToday],
      }),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: CACHES.assets,
        plugins: [keepRequestUrl, new ExpirationPlugin({ maxEntries: ASSET_CACHE_ENTRIES })],
      }),
    },
  ],
});

self.addEventListener("error", (event) => report("sw-crashed", event.error ?? event.message));

self.addEventListener("unhandledrejection", (event) => report("sw-crashed", event.reason));

self.addEventListener("activate", (event) => {
  event.waitUntil(cachePages());
});

self.addEventListener("message", (event) => {
  if (isWarmPhotos(event.data)) event.waitUntil(warmPhotos(event.data.ids, event));
});

self.addEventListener("push", (event) => {
  event.waitUntil(showPush(self, readPush(event)));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(openPush(self.clients, event.notification.data));
});

serwist.addEventListeners();

async function cachePage(cache: Cache, path: string): Promise<void> {
  const response = await fetch(path);

  if (response.ok) await cache.put(path, response);
}

async function cachePages(): Promise<void> {
  const cache = await caches.open(CACHES.pages);

  await Promise.all(OFFLINE_PAGES.map((path) => cachePage(cache, path).catch(() => {})));
}

async function warmPhotos(ids: string[], event: ExtendableEvent): Promise<void> {
  for (const url of photoFileUrls(ids)) {
    await photos.handle({ request: new Request(url), event }).catch(() => undefined);
  }
}

function readPush(event: PushEvent): unknown {
  try {
    return event.data?.json();
  } catch {
    return undefined;
  }
}
