import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  synced,
} from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { AccountSettings, CalendarEvent, Weather } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { clockTime } from "@/ui/testClock";
import { AmbientScreen } from "./AmbientScreen";

const navigation = vi.hoisted(() => ({ push: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => "/ambient",
}));

const NOW = new Date(2026, 9, 9, 19, 12);

const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();

const LOCATED: AccountSettings = {
  ...DEFAULT_SETTINGS,
  weatherLocation: { name: "Portland", region: "Oregon", lat: 45.5152, lon: -122.6784 },
};

const day = (date: string, precip?: number) => ({
  date,
  icon: "cloud-rain" as const,
  high: 60,
  low: 48,
  ...(precip !== undefined && { precip }),
});

const WEATHER: Weather = {
  location: "Portland, OR",
  fetchedAt: at(9, 19),
  current: {
    temp: 56,
    condition: "lightRain",
    icon: "cloud-rain",
    high: 68,
    low: 51,
    feelsLike: 54,
    windMph: 8,
    windDir: "NW",
    humidity: 80,
    uv: 0,
    sunset: at(9, 18),
  },
  hourly: [],
  daily: [day("2026-10-09", 90), day("2026-10-10", 80), day("2026-10-11", 30)],
};

const TODAY_EVENT: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000002",
  startAt: at(9, 20),
  title: "Movie night",
  tone: 2,
};

const CONFERENCE: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  startAt: at(14, 16),
  title: "Parent-teacher conference",
  location: "Lincoln Elementary",
  tone: 4,
};

const TOMORROW_EVENT: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  startAt: at(10, 9),
  title: "Farmers market",
  tone: 1,
};

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-ambient-screen-test");

  navigation.push.mockReset();
});

afterEach(async () => {
  cleanup();

  await store.close();
});

function renderAmbient() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SeasonProvider>
        <NetworkProvider>{children}</NetworkProvider>
      </SeasonProvider>
    </Shell>
  );

  return render(<AmbientScreen />, { wrapper });
}

async function seed(events: readonly CalendarEvent[], located = true) {
  const settings = located ? LOCATED : DEFAULT_SETTINGS;

  await store.db.settings.put(synced({ ...settings, accountId: store.accountId }));
  await store.db.events.bulkPut(events.map((row) => synced(row)));

  if (located) await store.db.weather.put({ ...WEATHER, accountId: store.accountId });
}

test("AMB-04 the whole screen is one Wake screen button that opens Today", async () => {
  await seed([TODAY_EVENT, CONFERENCE]);

  renderAmbient();

  await userEvent.click(await screen.findByRole("button", { name: "Wake screen" }));

  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(navigation.push).toHaveBeenCalledWith("/today");
});

test("AMB-07 signed out by the server, the wake tap opens the signed-out form", async () => {
  await seed([TODAY_EVENT]);
  await putSyncStatus(store, { online: true, weather: { state: "idle" }, error: "unauthorized" });

  renderAmbient();

  expect(await screen.findByText("Signed out · tap to sign in")).toBeInTheDocument();
  expect(screen.getByText("56° · Light rain")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Wake screen" }));

  expect(navigation.push).toHaveBeenCalledWith("/signin");
});

test("AMB-03 shows the current weather, the overnight low with the next rainy day and the next event", async () => {
  await seed([TODAY_EVENT, CONFERENCE]);

  renderAmbient();

  expect(await screen.findByText("56° · Light rain")).toBeInTheDocument();
  expect(screen.getByText("Low 51° overnight · Sat 80% rain")).toBeInTheDocument();
  expect(
    await screen.findByText(
      "Wed, Oct 14 · 4:00 PM · Parent-teacher conference, Lincoln Elementary",
    ),
  ).toBeInTheDocument();
});

test("AMB-03 an event on the next day reads Tomorrow and one with no place ends at its title", async () => {
  await seed([TOMORROW_EVENT]);

  renderAmbient();

  expect(await screen.findByText("Tomorrow · 9:00 AM · Farmers market")).toBeInTheDocument();
});

test("AMB-03 with no upcoming event and no weather location it says Nothing scheduled and hides the weather", async () => {
  await seed([], false);
  await markSynced(store);

  renderAmbient();

  expect(await screen.findByText("Nothing scheduled")).toBeInTheDocument();
  expect(screen.queryByText(/overnight/)).not.toBeInTheDocument();
});

test("AMB-02 the giant clock shows the frozen time", async () => {
  await seed([]);

  renderAmbient();

  expect(await screen.findByText(clockTime("7:12"))).toBeInTheDocument();
});
