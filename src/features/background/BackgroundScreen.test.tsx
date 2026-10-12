import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { FixtureParams } from "@/data/repos";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { ok } from "@/domain/result";
import type { Photo } from "@/domain/schemas";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
import { NetworkProvider } from "@/shell/providers/network";
import { shellWrapper } from "@/shell/providers/testShell";
import { BackgroundScreen } from "./BackgroundScreen";

const navigation = vi.hoisted(() => ({ push: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));

const NOW = new Date(2026, 9, 9, 10, 41);

const photo = (n: number, title: string, createdAt: string): Photo => ({
  id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  title,
  takenOn: "2026-09-06",
  createdAt,
});

const FOREST = photo(1, "Forest Park trail", "2026-10-05T19:00:00.000Z");

const COAST = photo(2, "Cannon Beach", "2026-10-05T19:05:00.000Z");

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-background-screen-test");

  navigation.push.mockReset();

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();

  await store.close();
});

function renderBackground(params: FixtureParams = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider>
        <FixtureParamsProvider params={params}>{children}</FixtureParamsProvider>
      </NetworkProvider>
    </Shell>
  );

  return render(<BackgroundScreen />, { wrapper });
}

test("BG-02 the newest upload is listed first", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST)]);

  renderBackground();

  await screen.findByRole("button", { name: "Use Cannon Beach as background" });

  expect(
    screen
      .getAllByRole("button", { name: /^Use .* as background$/ })
      .map((thumb) => thumb.ariaLabel),
  ).toEqual(["Use Cannon Beach as background", "Use Forest Park trail as background"]);
});

test("BG-03 tapping a thumb saves it as the background in Photo mode", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST)]);

  renderBackground();

  await userEvent.click(
    await screen.findByRole("button", { name: "Use Forest Park trail as background" }),
  );

  await waitFor(async () =>
    expect((await store.db.settings.get(store.accountId))?.background).toMatchObject({
      mode: "photo",
      photoId: FOREST.id,
    }),
  );
  expect(
    await screen.findByText(
      "Forest Park trail is the background on every screen. Panels stay solid on top.",
    ),
  ).toBeInTheDocument();
});

test("BG-03 tapping a thumb in Slideshow shows it now and keeps the slideshow", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST)]);

  await store.db.settings.put(
    synced({
      ...DEFAULT_SETTINGS,
      accountId: store.accountId,
      background: { ...DEFAULT_SETTINGS.background, mode: "slideshow", photoId: COAST.id },
    }),
  );

  renderBackground();

  await userEvent.click(
    await screen.findByRole("button", { name: "Use Forest Park trail as background" }),
  );

  expect(
    await screen.findByText(
      "Showing Forest Park trail. The photo changes daily; panels stay solid on top.",
    ),
  ).toBeInTheDocument();
  expect((await store.db.settings.get(store.accountId))?.background.mode).toBe("slideshow");
});

test("BG-02 upload=one puts the uploading tile first", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderBackground({ upload: "one" });

  expect(await screen.findByRole("progressbar")).toBeInTheDocument();
});

test("BG-01 the back link opens Settings", async () => {
  renderBackground();

  await userEvent.click(await screen.findByRole("button", { name: "Settings" }));

  expect(navigation.push).toHaveBeenCalledWith("/settings");
});

test("BG-02 Upload photo opens the picker and a finished upload joins the background list", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  store.upload.mockResolvedValue(ok(synced(photo(3, "IMG_2041", "2026-10-09T17:41:00.000Z"))));

  renderBackground();

  const picker = await screen.findByLabelText("Choose photos");

  const click = vi.spyOn(picker, "click");

  await userEvent.click(await screen.findByRole("button", { name: "Upload photo" }));

  await userEvent.upload(picker, new File(["x"], "IMG_2041.jpg", { type: "image/jpeg" }));

  expect(click).toHaveBeenCalled();
  expect(
    await screen.findByRole("button", { name: "Use IMG_2041 as background" }),
  ).toBeInTheDocument();
});
