import { cleanup, render, screen, within } from "@testing-library/react";
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
import type { CalendarEvent, Note, Photo, Tag, Weather, WeatherLocation } from "@/domain/schemas";
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

const MOM: Tag = {
  id: "0192f1a0-0000-7000-8000-000000000001",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const DAD: Tag = { ...MOM, id: "0192f1a0-0000-7000-8000-000000000002", name: "Dad", color: "sky" };

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();

const CALL: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  title: "Grandma’s video call",
  location: "Living room",
  startAt: iso(10, 30),
  endAt: iso(11, 15),
  everyone: true,
  tagIds: [],
};

const DAD_RUN: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000009",
  title: "Dad’s run",
  startAt: iso(15, 0),
  endAt: iso(16, 0),
  everyone: false,
  tagIds: [DAD.id],
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

const COAST_NAME = "Today’s photo: Cannon Beach, Sep 6, Summer trip";

const SWING: Photo = {
  ...COAST,
  id: "0195f0a0-0000-7000-8000-000000000012",
  title: "Mia on the swing",
  takenOn: "2026-07-12",
  place: "Laurelhurst Park",
  createdAt: "2026-10-04T19:05:00.000Z",
};

const WIFI: Note = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  text: "Wi-Fi password is on the fridge!",
  author: "Dad",
  createdAt: iso(8, 12),
  tone: 1,
  rotation: -2,
};

const GRANDPA: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000004",
  title: "Grandpa staying over",
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  everyone: true,
  tagIds: [],
};

const TOMORROW: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000005",
  title: "Soccer game",
  location: "Park",
  startAt: new Date(2026, 9, 10, 9, 0).toISOString(),
  endAt: new Date(2026, 9, 10, 10, 0).toISOString(),
  everyone: true,
  tagIds: [],
};

const WEATHER: Weather = {
  location: "Portland, OR",
  fetchedAt: iso(10, 0),
  current: {
    temp: 56,
    condition: "cloudy",
    icon: "cloud",
    high: 68,
    low: 51,
    feelsLike: 54,
    windMph: 8,
    windDir: "NW",
    humidity: 80,
    uv: 0,
    sunset: iso(18, 30),
  },
  hourly: [{ time: iso(15, 0), icon: "cloud", temp: 63, precip: 10 }],
  daily: [{ date: "2026-10-09", icon: "cloud", high: 68, low: 51 }],
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
  vi.restoreAllMocks();

  await store.close();
});

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

function renderToday({ who }: { who?: string[] } = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW, who });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SeasonProvider>
        <NetworkProvider>
          <SheetHost>{children}</SheetHost>
        </NetworkProvider>
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
  expect(screen.getByText("34 min left")).toBeInTheDocument();
  expect(screen.getByText("Living room · until 11:15 · Everyone")).toBeInTheDocument();
  expect(screen.getByText("Today · 1 of 1 left")).toBeInTheDocument();
});

test("TODAY-13 a day with no events is wide open until 9 PM, and what comes next shows in Coming up", async () => {
  await store.db.events.put(synced(TOMORROW));

  await markSynced(store);

  renderToday();

  expect(await screen.findByText("The day is wide open")).toBeInTheDocument();
  expect(screen.getByText("Free until 9 PM · 10 h 19 min")).toBeInTheDocument();
  expect(screen.queryByText("Next on the calendar")).not.toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /^Soccer game, Tomorrow, / })).toBeVisible();
});

test("TODAY-02 once every event ended the day is a wrap", async () => {
  await store.db.events.put(synced({ ...CALL, startAt: iso(8, 0), endAt: iso(9, 0) }));

  await markSynced(store);

  renderToday();

  expect(await screen.findByText("That’s a wrap for today")).toBeInTheDocument();
  expect(screen.getByText("1 event done · free until 9 PM")).toBeInTheDocument();
});

test("TODAY-13 the open day ribbon marks the sunset from the forecast", async () => {
  await createSettingsRepo(store).update({ weatherLocation: PORTLAND });
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });

  await markSynced(store);

  const { container } = renderToday();

  await screen.findByText("The day is wide open");

  expect(container.querySelector(".lucide-sunset")).toBeInTheDocument();
});

test("TODAY-02 tapping the hero event opens Event details", async () => {
  await store.db.events.put(synced(CALL));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /Happening now/ }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "event", id: CALL.id }),
  );
});

test("TODAY-04 Add event opens New event on today for everyone", async () => {
  await store.db.events.put(synced(CALL));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Add event" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "newevent", day: "2026-10-09", who: { everyone: true, tagIds: [] } }),
  );
});

test("TODAY-04 the filter is Calendar's: it starts from the shared filter and Add event pre-fills the people shown", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);
  await store.db.events.bulkPut([synced(CALL), synced(DAD_RUN)]);

  renderToday({ who: [MOM.id] });

  expect(
    await screen.findByRole("button", { name: "Show plans for: Mom. Change" }),
  ).toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: "Add event" }));

  expect(screen.queryByRole("button", { name: /^Dad’s run, / })).not.toBeInTheDocument();

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({
      kind: "newevent",
      day: "2026-10-09",
      who: { everyone: false, tagIds: [MOM.id] },
    }),
  );
});

test("TODAY-04 below 1440 px Add event and Full calendar are icon-only", async () => {
  await store.db.events.put(synced(CALL));
  vi.stubGlobal("innerWidth", 1439);

  renderToday();

  expect(await screen.findByRole("button", { name: "Add event" })).toHaveTextContent(/^$/);
  expect(screen.getByRole("button", { name: "Full calendar" })).toHaveTextContent(/^$/);
});

test("TODAY-04 at 1440 px Add event and Full calendar show their labels", async () => {
  await store.db.events.put(synced(CALL));
  vi.stubGlobal("innerWidth", 1440);
  vi.stubGlobal("innerHeight", 900);

  renderToday();

  expect(await screen.findByRole("button", { name: "Add event" })).toHaveTextContent("Add event");
  expect(screen.getByRole("button", { name: "Full calendar" })).toHaveTextContent("Full calendar");
});

test("TODAY-04 Full calendar goes to the Calendar view", async () => {
  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Full calendar" }));

  expect(navigation.push).toHaveBeenCalledWith("/calendar");
});

test("TODAY-11 every plan from 5 AM to 9 PM shows on the timeline, with no See all", async () => {
  const day = Array.from({ length: 9 }, (_, hour) => ({
    ...CALL,
    id: `0195f0a0-0000-7000-8000-00000000010${hour}`,
    title: `Plan ${hour}`,
    startAt: iso(11 + hour, 30),
    endAt: iso(11 + hour, 45),
  }));

  await store.db.events.bulkPut(day.map(synced));

  renderToday();

  expect(await screen.findAllByRole("button", { name: /^Plan \d, / })).toHaveLength(9);
  expect(screen.queryByRole("button", { name: /See all/ })).not.toBeInTheDocument();
});

test("TODAY-03 tapping a plan opens Event details", async () => {
  await store.db.events.put(synced(CALL));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /^Grandma’s video call, / }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "event", id: CALL.id }),
  );
});

test("TODAY-03 tapping an all-day tile opens Event details", async () => {
  await store.db.events.bulkPut([synced(CALL), synced(GRANDPA)]);

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /Grandpa staying over/ }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "event", id: GRANDPA.id }),
  );
});

test("TODAY-03 TL-08 tapping a free slot opens New event at that slot", async () => {
  await store.db.events.put(synced(CALL));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /^Free / }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({
      kind: "newevent",
      day: "2026-10-09",
      who: { everyone: true, tagIds: [] },
      times: { start: 675, end: 735 },
    }),
  );
});

test("TODAY-11 each hour label shows that hour's weather", async () => {
  await store.db.events.put(synced(CALL));
  await createSettingsRepo(store).update({ weatherLocation: PORTLAND });
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(900);

  renderToday();

  expect(await screen.findByText("63°")).toBeInTheDocument();
});

test("TODAY-07 tapping today's photo opens Photos on that photo", async () => {
  await store.db.photos.put(synced(COAST));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: COAST_NAME }));

  expect(navigation.push).toHaveBeenCalledWith(`/photos?photo=${COAST.id}`);
});

test("TODAY-07 a photo taken on this date in an earlier year shows as On this day", async () => {
  await store.db.photos.put(synced({ ...COAST, takenOn: "2025-10-09" }));

  renderToday();

  expect(await screen.findByText("On this day · 2025")).toBeInTheDocument();
});

test("TODAY-07 the more row and All photos go to Photos", async () => {
  await store.db.photos.put(synced(COAST));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "All photos" }));

  await store.db.photos.put(synced(SWING));

  await userEvent.click(await screen.findByRole("button", { name: "1 more photo, open Photos" }));

  expect(navigation.push).toHaveBeenNthCalledWith(1, "/photos");
  expect(navigation.push).toHaveBeenNthCalledWith(2, "/photos");
});

test("TODAY-07 on large the empty tile opens Add from your phone inside the panel", async () => {
  await markSynced(store);

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Add photos from your phone" }));

  expect(screen.getByRole("group", { name: "Add photos from your phone" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Done" }));

  expect(screen.getByText("A memory to share?")).toBeInTheDocument();
});

test("TODAY-07 on small the empty tile opens the file picker", async () => {
  await markSynced(store);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Add photos" }));

  expect(click).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("group", { name: "Add photos from your phone" }),
  ).not.toBeInTheDocument();
});

test("TODAY-07 TODAY-10 on a photo background today's photo is a different photo", async () => {
  await store.db.photos.bulkPut([synced(COAST), synced(SWING)]);
  await createSettingsRepo(store).update({
    background: { mode: "photo", photoId: COAST.id, dim: 0.2, rotate: "daily" },
  });

  renderToday();

  expect(
    await screen.findByRole("button", { name: /^Today’s photo: Mia on the swing/ }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: COAST_NAME })).not.toBeInTheDocument();
});

test("TODAY-10 a photo background with no photos keeps the add tile", async () => {
  await markSynced(store);
  await createSettingsRepo(store).update({
    background: { mode: "photo", photoId: COAST.id, dim: 0.2, rotate: "daily" },
  });

  renderToday();

  expect(await screen.findByText("A memory to share?")).toBeInTheDocument();
});

test("TODAY-08 with no location the Now panel asks for one", async () => {
  await markSynced(store);

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /Set weather location/ }));

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

test("TODAY-09 the empty pad opens New note", async () => {
  await markSynced(store);

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: "Add the first note" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "newnote" }),
  );
});

test("TODAY-09 tapping a note opens Note details for it", async () => {
  await markSynced(store);
  await store.db.notes.put(synced(WIFI));

  renderToday();

  await userEvent.click(await screen.findByRole("button", { name: /Wi-Fi/ }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "note", id: WIFI.id }),
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
    within(screen.getByRole("dialog")).getByRole("button", { name: "Save event" }),
  );

  expect(await screen.findByText("Picnic")).toBeInTheDocument();
  expect(screen.getByText("Today · 2 of 2 left")).toBeInTheDocument();
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

  expect(await screen.findByText("Today · 1 of 1 left · Updated 9:32 AM")).toBeInTheDocument();
});

test("TODAY-08 a failed weather fetch counts down in the Now panel", async () => {
  await markSynced(store);
  await createSettingsRepo(store).update({ weatherLocation: PORTLAND });
  await putSyncStatus(store, {
    online: true,
    weather: { state: "failed", retryAt: new Date(NOW.getTime() + 60_000).toISOString() },
  });

  renderToday();

  expect(await screen.findByText("Weather unavailable")).toBeInTheDocument();
  expect(screen.getByText("Trying again in 1 min.")).toBeInTheDocument();
});
