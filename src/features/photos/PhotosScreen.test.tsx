import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { FixtureParams } from "@/data/repos";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import type { Photo } from "@/domain/schemas";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
import { NetworkProvider } from "@/shell/providers/network";
import { shellWrapper } from "@/shell/providers/testShell";
import { PhotosScreen } from "./PhotosScreen";

const NOW = new Date(2026, 9, 9, 10, 41);

const photo = (n: number, title: string, createdAt: string): Photo => ({
  id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  title,
  takenOn: "2026-09-27",
  place: "Sauvie Island",
  createdAt,
});

const FOREST = photo(1, "Forest Park trail", "2026-10-05T19:00:00.000Z");

const APPLES = photo(2, "Apple picking", "2026-10-05T19:04:00.000Z");

const COAST = photo(3, "Cannon Beach", "2026-10-05T19:05:00.000Z");

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-photos-screen-test");

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();

  await store.close();
});

function renderPhotos(params: FixtureParams = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider>
        <FixtureParamsProvider params={params}>{children}</FixtureParamsProvider>
      </NetworkProvider>
    </Shell>
  );

  return render(<PhotosScreen />, { wrapper });
}

function featuredTitle() {
  return screen.getByRole("img", { name: /.+/ }).getAttribute("alt");
}

test("PHOTO-03 the newest upload is listed and featured first", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos();

  expect(await screen.findByText("Family photos · 3")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Show / }).map((thumb) => thumb.ariaLabel)).toEqual(
    ["Show Cannon Beach", "Show Apple picking", "Show Forest Park trail"],
  );
  expect(featuredTitle()).toBe("Cannon Beach");
});

test("PHOTO-01 tapping a thumb features it and the chevrons wrap at both ends", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Show Forest Park trail" }));

  expect(featuredTitle()).toBe("Forest Park trail");

  await userEvent.click(screen.getByRole("button", { name: "Next photo" }));

  expect(featuredTitle()).toBe("Cannon Beach");

  await userEvent.click(screen.getByRole("button", { name: "Previous photo" }));

  expect(featuredTitle()).toBe("Forest Park trail");
});

test("PHOTO-02 Pause and Play toggle the slideshow button", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Pause slideshow" }));

  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
});

test("PHOTO-05 with no photos the view is empty", async () => {
  renderPhotos();

  expect(await screen.findByText("No photos yet")).toBeInTheDocument();
});

test("PHOTO-08 upload=error opens with the three failed tiles", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos({ upload: "error" });

  expect(await screen.findAllByRole("alert")).toHaveLength(3);
});
