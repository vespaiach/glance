import { readdirSync } from "node:fs";
import path from "node:path";
import {
  isPhotoFile,
  isRscRequest,
  isWarmPhotos,
  OFFLINE_PAGES,
  pageCacheKey,
  photoFileUrl,
  photoFileUrls,
  rscCacheKey,
  WARM_PHOTOS,
} from "./rules";

const ORIGIN = "https://glance.example";

function appPagePaths(): string[] {
  const appDir = path.join(import.meta.dirname, "../../app");

  return readdirSync(appDir, { recursive: true, encoding: "utf8" })
    .filter((file) => path.basename(file) === "page.tsx")
    .map((file) =>
      `/${path.dirname(file)}`
        .split(path.sep)
        .join("/")
        .replace(/\/\([^)]+\)/g, ""),
    );
}

function rsc(url: string, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${url}`, { headers: { RSC: "1", ...headers } });
}

describe("offline pages", () => {
  it("OFF-06 lists every static page the app builds except the public /terms (D34)", () => {
    const pages = appPagePaths().filter((page) => page !== "/terms");

    expect([...OFFLINE_PAGES].sort()).toEqual(pages.sort());
  });
});

describe("page cache keys", () => {
  it("D16 a page is cached by its path, without the query", () => {
    expect(pageCacheKey(new URL(`${ORIGIN}/calendar?date=2026-10-12`))).toBe(`${ORIGIN}/calendar`);
  });

  it("D16 an RSC request is cached by path and prefetched segment, ignoring _rsc", () => {
    const tree = rsc("/today?_rsc=abc", {
      "Next-Router-Prefetch": "1",
      "Next-Router-Segment-Prefetch": "/_tree",
    });

    const sameTree = rsc("/today?_rsc=xyz", {
      "Next-Router-Prefetch": "1",
      "Next-Router-Segment-Prefetch": "/_tree",
    });

    const page = rsc("/today?_rsc=abc", {
      "Next-Router-Prefetch": "1",
      "Next-Router-Segment-Prefetch": "/!KGRpc3BsYXkp/!KGFwcCk/today/__PAGE__",
    });

    const full = rsc("/today?_rsc=abc");

    expect(rscCacheKey(tree)).toBe(rscCacheKey(sameTree));
    expect(new Set([rscCacheKey(tree), rscCacheKey(page), rscCacheKey(full)]).size).toBe(3);
    expect(rscCacheKey(full).startsWith(`${ORIGIN}/today`)).toBe(true);
  });

  it("D16 only same-origin page requests with RSC: 1 are RSC requests", () => {
    const own = new URL(ORIGIN);

    expect(isRscRequest(rsc("/notes?_rsc=1"), own)).toBe(true);
    expect(isRscRequest(new Request(`${ORIGIN}/notes`), own)).toBe(false);
    expect(isRscRequest(rsc("/api/sync"), own)).toBe(false);
    expect(isRscRequest(rsc("/notes"), new URL("https://other.example"))).toBe(false);
  });
});

describe("photo files", () => {
  const id = "0195f0a0-0000-7000-8000-000000000201";

  it("D16 matches only photo file requests", () => {
    expect(isPhotoFile(new URL(`${ORIGIN}${photoFileUrl(id, "display")}`))).toBe(true);
    expect(isPhotoFile(new URL(`${ORIGIN}/api/photos`))).toBe(false);
    expect(isPhotoFile(new URL(`${ORIGIN}/api/photos/${id}`))).toBe(false);
  });

  it("OFF-06 warming fetches the thumb and display file of each photo", () => {
    expect(photoFileUrls([id, "p2"])).toEqual([
      `/api/photos/${id}/file?v=thumb`,
      `/api/photos/${id}/file?v=display`,
      "/api/photos/p2/file?v=thumb",
      "/api/photos/p2/file?v=display",
    ]);
  });

  it("tech§4.5 a warm message carries a list of photo ids", () => {
    expect(isWarmPhotos({ type: WARM_PHOTOS, ids: ["p1"] })).toBe(true);
    expect(isWarmPhotos({ type: WARM_PHOTOS, ids: [1] })).toBe(false);
    expect(isWarmPhotos({ type: "SKIP_WAITING" })).toBe(false);
    expect(isWarmPhotos(null)).toBe(false);
  });
});
