import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createSettingsRepo } from "@/data/repos";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  synced,
} from "@/data/repos/testHarness";
import type { CalendarEvent, Photo, WeatherLocation } from "@/domain/schemas";
import { EventSheetScreen } from "@/features/events";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { SheetHost, useSheetHost } from "@/shell/SheetHost";
import { TodayScreen } from "./TodayScreen";

const navigation = vi.hoisted(() => ({ push: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ push: navigation.push, prefetch: () => {} }),
}));

const NOW = new Date(2026, 9, 9, 10, 41);

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();

const CALL: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  title: "Grandma’s video call",
  location: "Living room",
  startAt: iso(10, 30),
  endAt: iso(11, 15),
  everyone: true,
  memberIds: [],
};

const COAST: Photo = {
  id: "0195f0a0-0000-7000-8000-000000000002",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  place: "Summer trip",
  createdAt: "2026-10-05T19:05:00.000Z",
};

const PORTLAND: WeatherLocation = { name: "Portland", region: "Oregon", lat: 45.5, lon: -122.7 };

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-today-screen-test");
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

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

function renderToday() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SeasonProvider>
        <SheetHost>{children}</SheetHost>
      </SeasonProvider>
    </Shell>
  );

  return render(
    <>
      <TodayScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

test("TODAY-02 the hero shows the event running now", async () => {
  await store.db.events.put(synced(CALL));

  renderToday();

  expect(await screen.findByText("Happening now")).toBeInTheDocument();
  expect(screen.getByText("Living room · until 11:15")).toBeInTheDocument();
  expect(screen.getByText("Today · 1 event")).toBeInTheDocument();
});

test("TODAY-03 tapping the hero event opens Edit event", async () => {
  await store.db.events.put(synced(CALL));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /Happening now/ }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "event", id: CALL.id }),
  );
});

test("TODAY-04 Add event opens New event on today", async () => {
  await store.db.events.put(synced(CALL));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Add event" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "newevent", day: "2026-10-09" }),
  );
});

test("TODAY-04 Full calendar goes to the Calendar view", async () => {
  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Full calendar" }));

  expect(navigation.push).toHaveBeenCalledWith("/calendar");
});

test("TODAY-11 See all goes to the Calendar on today", async () => {
  const day = Array.from({ length: 9 }, (_, hour) => ({
    ...CALL,
    id: `0195f0a0-0000-7000-8000-00000000010${hour}`,
    startAt: iso(9 + hour, 30),
    endAt: iso(9 + hour, 45),
  }));

  await store.db.events.bulkPut(day.map(synced));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /See all 9 events/ }));

  expect(navigation.push).toHaveBeenCalledWith("/calendar");
});

test("TODAY-07 tapping the picture of the day opens Photos on that photo", async () => {
  await store.db.photos.put(synced(COAST));

  renderToday();

  await userEvent.click(
    await screen.findByRole("button", { name: "Picture of the day: Cannon Beach" }),
  );

  expect(navigation.push).toHaveBeenCalledWith(`/photos?photo=${COAST.id}`);
});

test("TODAY-07 a photo taken on this date in an earlier year shows as On this day", async () => {
  await store.db.photos.put(synced({ ...COAST, takenOn: "2025-10-09" }));

  renderToday();

  expect(await screen.findByText("On this day · 2025")).toBeInTheDocument();
});

test("TODAY-07 with no photos Upload a photo goes to Photos", async () => {
  await markSynced(store);

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /Upload a photo/ }));

  expect(navigation.push).toHaveBeenCalledWith("/photos");
});

test("TODAY-10 a photo background drops the picture of the day", async () => {
  await store.db.photos.put(synced(COAST));
  await createSettingsRepo(store).update({
    background: { mode: "photo", photoId: COAST.id, dim: 0.2, rotate: "daily" },
  });

  renderToday();

  expect(await screen.findByText("Full calendar")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("Picture of the day")).not.toBeInTheDocument());
});

test("TODAY-10 a photo background with no photos keeps the Upload a photo slot", async () => {
  await markSynced(store);
  await createSettingsRepo(store).update({
    background: { mode: "photo", photoId: COAST.id, dim: 0.2, rotate: "daily" },
  });

  renderToday();

  expect(await screen.findByRole("button", { name: /Upload a photo/ })).toBeInTheDocument();
});

test("TODAY-08 with no location the weather zone asks for one", async () => {
  await markSynced(store);

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Set location" }));

  expect(navigation.push).toHaveBeenCalledWith("/weather");
});

test("TODAY-09 Add note opens New note", async () => {
  await markSynced(store);

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Add note" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "newnote" }),
  );
});

test("EVT-07 an event added from Today shows in the schedule at once", async () => {
  await store.db.events.put(synced(CALL));

  const Shell = shellWrapper(store, { frozenAt: NOW });

  render(
    <Shell>
      <SeasonProvider>
        <NetworkProvider>
          <SheetHost>
            <TodayScreen />
            <EventSheetScreen />
          </SheetHost>
        </NetworkProvider>
      </SeasonProvider>
    </Shell>,
  );

  await userEvent.click(await screen.findByRole("button", { name: "Add event" }));
  await userEvent.type(screen.getByLabelText("Title"), "Picnic");
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Add event" }),
  );

  expect(await screen.findByText("Picnic")).toBeInTheDocument();
  expect(screen.getByText("Today · 2 events")).toBeInTheDocument();
});

test("FAIL-01 a failed first sync shows each source unavailable with a countdown", async () => {
  await putSyncStatus(store, {
    online: true,
    error: "server",
    retryAt: new Date(NOW.getTime() + 2 * 60_000).toISOString(),
    weather: { state: "idle" },
  });

  renderToday();

  expect(await screen.findByText("Calendar unavailable")).toBeInTheDocument();
  expect(await screen.findByText("Notes unavailable")).toBeInTheDocument();
  expect(
    screen.getAllByText("The Glance server isn’t responding. Trying again in 2 min."),
  ).toHaveLength(2);
});

test("FAIL-01 Try again on a failed zone syncs now", async () => {
  await putSyncStatus(store, { online: true, error: "server", weather: { state: "idle" } });

  renderToday();

  await screen.findByText("Calendar unavailable");

  await userEvent.click(screen.getAllByRole("button", { name: "Try again" })[0] as HTMLElement);

  expect(store.nudge).toHaveBeenCalledTimes(1);
});

test("FAIL-02 saved events after a failed sync show when they were updated", async () => {
  await store.db.events.put(synced(CALL));
  await markSynced(store);
  await putSyncStatus(store, {
    online: true,
    error: "server",
    lastSyncedAt: iso(9, 32),
    weather: { state: "idle" },
  });

  renderToday();

  expect(await screen.findByText("Today · 1 event · Updated 9:32 AM")).toBeInTheDocument();
});

test("WX-05 a failed weather fetch counts down and Try again refreshes it", async () => {
  await markSynced(store);
  await createSettingsRepo(store).update({ weatherLocation: PORTLAND });
  await putSyncStatus(store, {
    online: true,
    weather: { state: "failed", retryAt: new Date(NOW.getTime() + 60_000).toISOString() },
  });

  renderToday();

  expect(await screen.findByText("Weather unavailable")).toBeInTheDocument();
  expect(
    screen.getByText("The forecast service isn’t responding. Trying again in 1 min."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(store.refreshWeather).toHaveBeenCalledTimes(1);
});
