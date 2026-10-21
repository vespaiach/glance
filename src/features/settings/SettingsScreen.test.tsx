import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { ok } from "@/domain/result";
import type { Photo } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { SettingsScreen } from "./SettingsScreen";

const navigation = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
  replace: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

const NOW = new Date(2026, 9, 9, 10, 41);

const COAST: Photo = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  createdAt: "2026-10-05T19:00:00.000Z",
};

const PORTLAND = {
  name: "Portland",
  region: "Oregon",
  lat: 45.52,
  lon: -122.68,
  timeZone: "America/Los_Angeles",
};

async function saveLocation(weatherLocation?: typeof PORTLAND | Omit<typeof PORTLAND, "timeZone">) {
  await store.db.settings.put(
    synced({
      ...DEFAULT_SETTINGS,
      ...(weatherLocation && { weatherLocation }),
      accountId: store.accountId,
    }),
  );
}

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-settings-screen-test");

  navigation.push.mockReset();
  navigation.replace.mockReset();

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();

  await store.close();
});

function renderSettings() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider>
        <SeasonProvider>{children}</SeasonProvider>
      </NetworkProvider>
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

  await userEvent.click(await screen.findByRole("radio", { name: "Winter" }));

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

test("SET-09 the Location row comes first and names the place and its time zone", async () => {
  await saveLocation(PORTLAND);

  renderSettings();

  const row = await screen.findByRole("button", { name: /Portland, OR · Pacific time/ });

  expect(screen.getAllByRole("button")[0]).toBe(row);
  expect(row).toHaveTextContent(/^LocationSets the weather and the time zone/);
});

test("SET-09 the Location row reads Not set without a location", async () => {
  await saveLocation();

  renderSettings();

  expect(
    await screen.findByRole("button", {
      name: /^Location.*Not set$/,
    }),
  ).toBeInTheDocument();
});

test("SET-09 a place saved before v0.32 shows without a time zone", async () => {
  const { timeZone: _, ...old } = PORTLAND;

  await saveLocation(old);

  renderSettings();

  expect(
    await screen.findByRole("button", {
      name: /^Location.*zonePortland, OR$/,
    }),
  ).toBeInTheDocument();
});

test("SET-09 the Location row opens the Location page", async () => {
  await saveLocation(PORTLAND);

  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: /^Location/ }));

  expect(navigation.push).toHaveBeenCalledWith("/settings/location");
});

test("SET-06 the Ambient screen tile opens the Ambient screen page", async () => {
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: /^Ambient screen/ }));

  expect(navigation.push).toHaveBeenCalledWith("/settings/ambient");
});

test("SIGNIN-11 Sign out signs this screen out and returns to the email form", async () => {
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));

  expect(store.signOut).toHaveBeenCalledOnce();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/signin"));
});

test("SET-12 the account card lists the screens read from the server", async () => {
  store.displays.mockResolvedValue({
    ok: true,
    value: [
      {
        id: "d1",
        kind: "monitor",
        browser: "Chrome",
        lastSeenAt: NOW.toISOString(),
        current: true,
      },
      {
        id: "d2",
        kind: "tablet",
        browser: "Safari",
        lastSeenAt: NOW.toISOString(),
        current: false,
      },
    ],
  });

  renderSettings();

  const list = await screen.findByRole("list", { name: "2 screens signed in" });

  expect(list).toHaveTextContent(/^Chrome screenThis screenSafari tablet/);
});

test("SET-12 offline the account card shows only this screen", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  );

  renderSettings();

  await waitFor(() => expect(store.displays).toHaveBeenCalled());
  const list = screen.getByRole("list", { name: "1 screen signed in" });
  expect(list).toHaveTextContent("Chrome phoneThis screen");
});

test("SIGNIN-15 Sign in another device shows a code for this account, and Done voids it", async () => {
  const url = "https://glance.example.com/api/auth/verify?t=abc";
  store.issueQr.mockResolvedValue(ok({ url }));
  store.voidQr.mockResolvedValue(ok(undefined));
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Sign in another device" }));

  expect(await screen.findByText("Code expires in 5:00")).toBeInTheDocument();
  expect(screen.getByText(/It signs in with maria@example.com\.$/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Done" }));

  expect(store.voidQr).toHaveBeenCalledWith(url);
  expect(screen.getByRole("button", { name: "Sign in another device" })).toBeInTheDocument();
});

test("SIGNIN-15 offline Sign in another device is disabled", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

  renderSettings();

  expect(await screen.findByRole("button", { name: "Sign in another device" })).toBeDisabled();
});
