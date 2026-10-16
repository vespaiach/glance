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
    sources: { title: "photo", takenOn: "photo", place: "photo-location" },
    checked: true,
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

function renderBackground(
  background: Partial<AccountSettings["background"]>,
  frozenAt = new Date(2026, 9, 9, 10, 30),
) {
  return renderHook(() => useBackgroundPhoto(), {
    wrapper: shellWrapper(store, {
      frozenAt,
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

test("BG-06 an hourly Slideshow shows the next photo each hour, in upload order", async () => {
  await savePhotos();

  const slideshow = { mode: "slideshow", photoId: FIRST.id, rotate: "hourly", dim: 0 } as const;

  const hourOne = renderBackground(slideshow, new Date(1970, 0, 1, 0, 30));

  const hourTwo = renderBackground(slideshow, new Date(1970, 0, 1, 1, 30));

  await waitFor(() =>
    expect(hourOne.result.current).toEqual({ src: `/photos/${FIRST.id}/display`, dim: 0 }),
  );
  await waitFor(() =>
    expect(hourTwo.result.current).toEqual({ src: `/photos/${CHOSEN.id}/display`, dim: 0 }),
  );
});

test("BG-06 Photo mode with no photos keeps the season color", async () => {
  const { result } = renderBackground({ mode: "photo", photoId: CHOSEN.id });

  await waitFor(() => expect(result.current).not.toBeNull());

  expect(result.current).toBeUndefined();
});
