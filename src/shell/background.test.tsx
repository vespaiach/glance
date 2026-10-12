import { renderHook, waitFor } from "@testing-library/react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { AccountSettings, Photo } from "@/domain/schemas";
import { useBackgroundPhoto } from "./background";
import { shellWrapper } from "./providers/testShell";

function photo(n: number, createdAt: string): Photo {
  return {
    id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
    title: `Photo ${n}`,
    takenOn: "2026-09-27",
    createdAt,
  };
}

const FIRST = photo(1, "2026-09-01T10:00:00.000Z");

const CHOSEN = photo(2, "2026-10-04T10:00:00.000Z");

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-shell-background-test");
});

afterEach(() => store.close());

function renderBackground(background: Partial<AccountSettings["background"]>) {
  return renderHook(() => useBackgroundPhoto(), {
    wrapper: shellWrapper(store, {
      overrides: { background: { ...DEFAULT_SETTINGS.background, ...background } },
    }),
  });
}

async function savePhotos() {
  await store.db.photos.bulkPut([synced(FIRST), synced(CHOSEN)]);
}

test("BG-06 Season color mode shows no photo", async () => {
  await savePhotos();

  const { result } = renderBackground({ mode: "season", photoId: CHOSEN.id });

  await waitFor(() => expect(result.current).not.toBeNull());

  expect(result.current).toBeUndefined();
});

test("BG-06 Photo mode shows the chosen photo's display variant with its dim", async () => {
  await savePhotos();

  const { result } = renderBackground({ mode: "photo", photoId: CHOSEN.id, dim: 0.4 });

  await waitFor(() =>
    expect(result.current).toEqual({ src: `/photos/${CHOSEN.id}/display`, dim: 0.4 }),
  );
});

test("BG-06 Slideshow shows its current photo, the first one when none is chosen", async () => {
  await savePhotos();

  const { result } = renderBackground({ mode: "slideshow", dim: 0 });

  await waitFor(() =>
    expect(result.current).toEqual({ src: `/photos/${FIRST.id}/display`, dim: 0 }),
  );
});

test("BG-06 Photo mode with no photos keeps the season color", async () => {
  const { result } = renderBackground({ mode: "photo", photoId: CHOSEN.id });

  await waitFor(() => expect(result.current).not.toBeNull());

  expect(result.current).toBeUndefined();
});
