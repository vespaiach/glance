import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Photo } from "@/domain/schemas";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { SettingsScreen } from "./SettingsScreen";

const navigation = vi.hoisted(() => ({ push: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));

const NOW = new Date(2026, 9, 9, 10, 41);

const COAST: Photo = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  createdAt: "2026-10-05T19:00:00.000Z",
};

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-settings-screen-test");

  navigation.push.mockReset();

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

function renderSettings() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SeasonProvider>{children}</SeasonProvider>
    </Shell>
  );

  return render(<SettingsScreen />, { wrapper });
}

test("SET-01 the header reads the signed-in account's name and email", async () => {
  renderSettings();

  expect((await screen.findByText(/^Signed in as/)).textContent).toBe(
    "Signed in as Maria · maria@example.com",
  );
});

test("SET-02 choosing a season saves it to the account settings", async () => {
  renderSettings();

  await userEvent.click(await screen.findByRole("tab", { name: "Winter" }));

  await waitFor(async () =>
    expect((await store.db.settings.get(store.accountId))?.season).toBe("winter"),
  );
  expect(await screen.findByText("Fixed to Winter")).toBeInTheDocument();
});

test("SET-03 the Background row names the saved photo and opens the Background page", async () => {
  await store.db.photos.put(synced(COAST));
  await store.db.settings.put(
    synced({
      ...DEFAULT_SETTINGS,
      background: { ...DEFAULT_SETTINGS.background, mode: "photo", photoId: COAST.id },
      accountId: store.accountId,
    }),
  );

  renderSettings();

  const row = await screen.findByRole("button", { name: /Photo · Cannon Beach/ });

  await userEvent.click(row);

  expect(navigation.push).toHaveBeenCalledWith("/settings/background");
});

test("SET-06 Preview opens Ambient", async () => {
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Preview" }));

  expect(navigation.push).toHaveBeenCalledWith("/ambient");
});
