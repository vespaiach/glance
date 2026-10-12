export const SW_URL = "/serwist/sw.js";

export const OFFLINE_PAGES = [
  "/today",
  "/calendar",
  "/weather",
  "/notes",
  "/photos",
  "/settings",
  "/settings/background",
  "/settings/location",
  "/settings/ambient",
  "/ambient",
  "/signin",
] as const;

export const FALLBACK_PAGE = "/today";

export const CACHES = {
  pages: "pages",
  rsc: "pages-rsc",
  photos: "photos",
  assets: "assets",
} as const;

export const NETWORK_TIMEOUT_SECONDS = 3;

export const PHOTO_CACHE_ENTRIES = 300;

export const WARM_PHOTOS = "WARM_PHOTOS";

export type PhotoVariant = "display" | "thumb" | "orig";

export type WarmPhotosMessage = { type: typeof WARM_PHOTOS; ids: string[] };

const PHOTO_FILE = /^\/api\/photos\/[^/]+\/file$/;

const SEGMENT_HEADER = "Next-Router-Segment-Prefetch";

const PREFETCH_HEADER = "Next-Router-Prefetch";

export function photoFileUrl(photoId: string, variant: PhotoVariant): string {
  return `/api/photos/${photoId}/file?v=${variant}`;
}

export function photoFileUrls(ids: string[]): string[] {
  return ids.flatMap((id) => [photoFileUrl(id, "thumb"), photoFileUrl(id, "display")]);
}

export function isPhotoFile(url: URL): boolean {
  return PHOTO_FILE.test(url.pathname);
}

export function isWarmPhotos(data: unknown): data is WarmPhotosMessage {
  if (typeof data !== "object" || data === null) return false;

  const { type, ids } = data as Partial<WarmPhotosMessage>;

  return type === WARM_PHOTOS && Array.isArray(ids) && ids.every((id) => typeof id === "string");
}

export function isRscRequest(request: Request, origin: URL): boolean {
  const url = new URL(request.url);

  if (url.origin !== origin.origin || url.pathname.startsWith("/api/")) return false;

  return request.headers.get("RSC") === "1";
}

export function pageCacheKey(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function rscPart(headers: Headers): string {
  return (
    headers.get(SEGMENT_HEADER) ?? (headers.get(PREFETCH_HEADER) === "1" ? "prefetch" : "full")
  );
}

export function rscCacheKey(request: Request): string {
  const url = new URL(request.url);

  return `${pageCacheKey(url)}?rsc=${encodeURIComponent(rscPart(request.headers))}`;
}
