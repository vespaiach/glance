import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { err, ok } from "@/domain/result";
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

test("SIGNIN-11 Sign out opens the dialog and changes nothing yet", async () => {
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));

  expect(screen.getByRole("dialog", { name: "Sign out" })).toBeInTheDocument();
  expect(store.signOut).not.toHaveBeenCalled();
});

test("SIGNIN-11 Sign out this device signs this screen out and returns to the email form", async () => {
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  await userEvent.click(screen.getByRole("button", { name: "Sign out this device" }));

  expect(store.signOut).toHaveBeenCalledOnce();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/signin"));
});

test("SIGNIN-11 Sign out all devices returns to the email form with the toast", async () => {
  store.signOutAll.mockResolvedValue(ok(undefined));
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  await userEvent.click(screen.getByRole("button", { name: "Sign out all devices" }));

  expect(store.signOutAll).toHaveBeenCalledOnce();
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/signin?toast=signed-out-all"),
  );
});

test("SIGNIN-11 a failed Sign out all devices keeps the dialog open with the error", async () => {
  store.signOutAll.mockResolvedValue(err("server"));
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  await userEvent.click(screen.getByRole("button", { name: "Sign out all devices" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t sign out. Try again.");
  expect(screen.getByRole("dialog", { name: "Sign out" })).toBeInTheDocument();
  expect(navigation.replace).not.toHaveBeenCalled();
});

test("SIGNIN-11 Cancel closes the dialog", async () => {
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog", { name: "Sign out" })).not.toBeInTheDocument();
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

  expect(await screen.findByText("Code expires in 3:00")).toBeInTheDocument();
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

async function openDeleteAccount() {
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Delete account" }));
}

test("SET-14 Delete account opens the alert dialog and erases nothing yet", async () => {
  await openDeleteAccount();

  expect(screen.getByRole("alertdialog", { name: "Delete account?" })).toBeInTheDocument();
  expect(store.deleteAccount).not.toHaveBeenCalled();
});

test("SET-14 the erase list counts this account's events, notes, photos and family members", async () => {
  await store.db.photos.put(synced(COAST));
  await openDeleteAccount();

  const photos = screen
    .getAllByRole("listitem")
    .find((item) => item.textContent?.startsWith("Photos"));

  await waitFor(() => expect(photos).toHaveTextContent("Photos1"));
});

test("SET-14 a checked delete erases the account and returns to the email form with the toast", async () => {
  store.deleteAccount.mockResolvedValue(ok(undefined));
  await openDeleteAccount();

  await userEvent.click(screen.getByRole("checkbox", { name: /I understand/ }));
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete account" }),
  );

  expect(store.deleteAccount).toHaveBeenCalledOnce();
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/signin?toast=account-deleted"),
  );
});

test("SET-14 a failed delete keeps the dialog with the error, and Try again deletes again", async () => {
  store.deleteAccount.mockResolvedValue(err("server"));
  await openDeleteAccount();

  await userEvent.click(screen.getByRole("checkbox", { name: /I understand/ }));
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete account" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t delete the account");

  store.deleteAccount.mockResolvedValue(ok(undefined));
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(store.deleteAccount).toHaveBeenCalledTimes(2);
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/signin?toast=account-deleted"),
  );
});

test("SET-14 Keep account closes the dialog", async () => {
  await openDeleteAccount();

  await userEvent.click(screen.getByRole("button", { name: "Keep account" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("SET-14 offline Delete account is disabled", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

  renderSettings();

  expect(await screen.findByRole("button", { name: "Delete account" })).toBeDisabled();
});

test("FAM-08 removing a member deletes their only plans and takes them off shared ones", async () => {
  const tag = (n: number, name: string) => ({
    id: `0195f0a0-0000-7000-8001-00000000000${n}`,
    name,
    color: "coral" as const,
    createdAt: `2026-10-0${n}T09:00:00.000Z`,
  });
  const plan = (n: number, tagIds: string[]) => ({
    id: `0195f0a0-0000-7000-8002-00000000000${n}`,
    title: `Plan ${n}`,
    startAt: "2026-10-01T16:00:00.000Z",
    everyone: false,
    tagIds,
    notify: true,
  });
  const mom = tag(1, "Mom");
  const tin = tag(2, "Tin");
  const only = plan(1, [mom.id]);
  const shared = plan(2, [tin.id, mom.id]);
  await store.db.tags.bulkPut([synced(mom), synced(tin)]);
  await store.db.events.bulkPut([synced(only), synced(shared)]);
  renderSettings();

  await userEvent.click(await screen.findByRole("button", { name: "Remove Mom" }));
  expect(
    screen.getByText("Their 1 plan is deleted. They’re taken off 1 plan shared with others."),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));

  await waitFor(async () => expect((await store.db.tags.get(mom.id))?.deletedAt).toBeDefined());
  expect((await store.db.events.get(only.id))?.deletedAt).toBeDefined();
  expect((await store.db.events.get(shared.id))?.tagIds).toEqual([tin.id]);
  expect(await screen.findByText("Family · 1 member")).toBeInTheDocument();
});

const LAST_IMPORT = {
  id: "imp-1",
  importedAt: "2026-10-08T17:00:00.000Z",
  count: 16,
  who: "everyone",
  undoUntil: "2026-10-09T17:00:00.000Z",
};

test("SET-17 the Import events row shows Last: {date} after an import and opens Import events", async () => {
  store.imports.last.mockResolvedValue(ok(LAST_IMPORT));

  renderSettings();

  const row = await screen.findByRole("button", { name: /Import events.*Last: Oct 8/ });
  await userEvent.click(row);

  expect(navigation.push).toHaveBeenCalledWith("/settings/import");
});

test("SET-17 offline the Import events row has no summary", async () => {
  store.imports.last.mockResolvedValue(ok(LAST_IMPORT));
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

  renderSettings();

  const row = await screen.findByRole("button", { name: /Import events/ });
  await waitFor(() => expect(store.imports.last).toHaveBeenCalled());

  expect(row).not.toHaveTextContent("Last:");
});
