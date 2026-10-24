import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { shellWrapper } from "@/shell/providers/testShell";
import { AmbientScheduleScreen } from "./AmbientScheduleScreen";

const navigation = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/ambient",
  useRouter: () => ({ push: navigation.push }),
}));

const NOW = new Date("2026-10-09T17:41:00Z");

let store: Harness;

beforeEach(async () => {
  store = openHarness("glance-ambient-schedule-screen-test");

  navigation.push.mockReset();

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  await store.db.settings.put(synced({ ...DEFAULT_SETTINGS, accountId: store.accountId }));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();

  await store.close();
});

function renderScreen() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  return render(<AmbientScheduleScreen />, { wrapper: Shell });
}

async function savedAmbient() {
  return (await store.db.settings.get(store.accountId))?.ambient;
}

test("SET-10 a change to the schedule is saved at once", async () => {
  renderScreen();

  await userEvent.click(await screen.findByRole("button", { name: "Weekends differ" }));

  await waitFor(async () => expect((await savedAmbient())?.mode).toBe("split"));
  expect(await screen.findByRole("group", { name: "Fri & Sat nights" })).toBeInTheDocument();
});

test("SET-10 Preview opens Ambient and ‹ Settings goes back to Settings", async () => {
  renderScreen();

  await userEvent.click(await screen.findByRole("button", { name: "Preview" }));
  await userEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(navigation.push).toHaveBeenCalledWith("/ambient");
  expect(navigation.push).toHaveBeenCalledWith("/settings");
});
