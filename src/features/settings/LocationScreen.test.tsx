import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { ok } from "@/domain/result";
import type { CalendarEvent, WeatherLocation } from "@/domain/schemas";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { TimeZoneProvider } from "@/shell/providers/timeZone";
import { LocationScreen } from "./LocationScreen";

const navigation = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
  replace: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

const NOW = new Date("2026-10-09T17:41:00Z");

const place = (name: string, region: string, timeZone: string): WeatherLocation => ({
  name,
  region,
  lat: 45,
  lon: -100,
  timeZone,
});

const PORTLAND = place("Portland", "Oregon", "America/Los_Angeles");

const MAINE = place("Portland", "Maine", "America/New_York");

const SEATTLE = place("Seattle", "Washington", "America/Los_Angeles");

const PHOENIX = place("Phoenix", "Arizona", "America/Phoenix");

const DENVER = place("Denver", "Colorado", "America/Denver");

const SOCCER: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000005",
  title: "Soccer practice",
  startAt: "2026-10-09T22:30:00.000Z",
  everyone: true,
  tagIds: [],
  notify: true,
};

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-location-screen-test");

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

  await store.close();
});

async function saveLocation(weatherLocation?: WeatherLocation) {
  await store.db.settings.put(
    synced({
      ...DEFAULT_SETTINGS,
      ...(weatherLocation && { weatherLocation }),
      accountId: store.accountId,
    }),
  );
}

function renderLocation() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <TimeZoneProvider>
        <SeasonProvider>{children}</SeasonProvider>
      </TimeZoneProvider>
    </Shell>
  );

  return render(<LocationScreen />, { wrapper });
}

async function search(query: string, matches: WeatherLocation[]) {
  store.places.mockResolvedValue(ok(matches));

  await userEvent.type(await screen.findByLabelText("City or ZIP code"), query);
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
}

async function askForMaine() {
  await search("Portland", [PORTLAND, MAINE]);

  await userEvent.click(await screen.findByRole("button", { name: /Maine, United States/ }));

  return screen.findByRole("group", { name: "Switch to Eastern time?" });
}

test("SET-09 Now set to names the place, its time zone and the clock", async () => {
  await saveLocation(PORTLAND);

  renderLocation();

  expect(await screen.findByText("Portland, OR")).toBeInTheDocument();
  expect(screen.getByText("Pacific time · 10:41 AM")).toBeInTheDocument();
  expect(screen.getByText("Change location")).toBeInTheDocument();
  expect(
    screen.getByText(
      "The clock and event times follow Pacific time, even if this device is set to a different time.",
    ),
  ).toBeInTheDocument();
});

test("SET-09 without a location the page reads Not set and times follow the device", async () => {
  await saveLocation();

  renderLocation();

  expect(await screen.findByText("Set location")).toBeInTheDocument();
  expect(screen.getByText("Not set")).toBeInTheDocument();
  expect(screen.getByText("Times follow this device’s own clock")).toBeInTheDocument();
  expect(
    screen.getByText("Until a location is set, times follow this device’s own clock."),
  ).toBeInTheDocument();
});

test("SET-09 a place saved before v0.32 shows its name with the device clock line", async () => {
  const { timeZone: _, ...old } = PORTLAND;

  await saveLocation(old);

  renderLocation();

  expect(await screen.findByText("Portland, OR")).toBeInTheDocument();
  expect(screen.getByText("Times follow this device’s own clock")).toBeInTheDocument();
});

test("SET-09 ‹ Settings goes back to Settings", async () => {
  await saveLocation(PORTLAND);

  renderLocation();

  await userEvent.click(await screen.findByRole("button", { name: "Settings" }));

  expect(navigation.push).toHaveBeenCalledWith("/settings");
});

test("SET-09 a place in the same time zone saves at once and returns to Settings", async () => {
  await saveLocation(PORTLAND);

  renderLocation();

  await search("Seattle", [SEATTLE]);

  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/settings"));
  expect((await store.db.settings.get(store.accountId))?.weatherLocation).toEqual(SEATTLE);
});

test("LOC-09 the first place saves at once with no confirm", async () => {
  await saveLocation();

  renderLocation();

  await search("04101", [MAINE]);

  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/settings"));
  expect((await store.db.settings.get(store.accountId))?.weatherLocation).toEqual(MAINE);
});

test("LOC-09 a place in another time zone asks first, with both clocks and an example", async () => {
  await saveLocation(PORTLAND);
  await store.db.events.put(synced(SOCCER));

  renderLocation();

  const confirm = await askForMaine();

  expect(within(confirm).getByText("Time zone change")).toBeInTheDocument();
  expect(
    within(confirm).getByText(
      "Portland, ME is in Eastern time. The clock moves 3 hours ahead, and event times change to match on every screen.",
    ),
  ).toBeInTheDocument();
  expect(within(confirm).getByText("Now · Pacific time")).toBeInTheDocument();
  expect(within(confirm).getByText("10:41 AM")).toBeInTheDocument();
  expect(within(confirm).getByText("After · Eastern time")).toBeInTheDocument();
  expect(within(confirm).getByText("1:41 PM")).toBeInTheDocument();
  expect(
    await within(confirm).findByText("Soccer practice at 3:30 PM will show at 6:30 PM."),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("City or ZIP code")).not.toBeInTheDocument();
  expect((await store.db.settings.get(store.accountId))?.weatherLocation).toEqual(PORTLAND);
});

test("LOC-09 no upcoming event leaves the example out", async () => {
  await saveLocation(PORTLAND);

  renderLocation();

  const confirm = await askForMaine();

  expect(within(confirm).queryByText(/will show at/)).not.toBeInTheDocument();
});

test("LOC-09 Switch saves the new place and returns to Settings", async () => {
  await saveLocation(PORTLAND);

  renderLocation();

  const confirm = await askForMaine();

  await userEvent.click(within(confirm).getByRole("button", { name: "Switch to Eastern time" }));

  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/settings"));
  expect((await store.db.settings.get(store.accountId))?.weatherLocation).toEqual(MAINE);
});

test("LOC-09 Keep goes back to the card with the draft kept", async () => {
  await saveLocation(PORTLAND);

  renderLocation();

  const confirm = await askForMaine();

  await userEvent.click(within(confirm).getByRole("button", { name: "Keep Pacific time" }));

  expect(await screen.findByLabelText("City or ZIP code")).toHaveValue("Portland");
  expect((await store.db.settings.get(store.accountId))?.weatherLocation).toEqual(PORTLAND);
  expect(navigation.replace).not.toHaveBeenCalled();
});

test("LOC-09 a zone that reads the same time today says it can differ later", async () => {
  await saveLocation(PORTLAND);
  await store.db.events.put(synced(SOCCER));

  renderLocation();

  await search("Phoenix", [PHOENIX]);

  const confirm = await screen.findByRole("group", { name: "Switch to Arizona time?" });

  expect(
    within(confirm).getByText(
      "Phoenix, AZ is in Arizona time. The time is the same right now, but it can differ later in the year.",
    ),
  ).toBeInTheDocument();
  expect(within(confirm).queryByText(/will show at/)).not.toBeInTheDocument();
});

test("LOC-09 a one-hour change reads 1 hour", async () => {
  await saveLocation(PORTLAND);

  renderLocation();

  await search("Denver", [DENVER]);

  expect(
    await screen.findByText(
      "Denver, CO is in Mountain time. The clock moves 1 hour ahead, and event times change to match on every screen.",
    ),
  ).toBeInTheDocument();
});
