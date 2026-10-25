import { act, fireEvent, render, screen } from "@testing-library/react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import type { AccountSettings, CalendarEvent } from "@/domain/schemas";
import { IdleProvider } from "./providers/idle";
import { shellWrapper } from "./providers/testShell";
import { ReminderHost } from "./ReminderHost";
import { SheetHost, useSheetHost } from "./SheetHost";

const navigation = vi.hoisted(() => ({ push: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/calendar",
  useRouter: () => ({ push: navigation.push }),
}));

const at = (h: number, m: number, s = 0) => new Date(2026, 9, 9, h, m, s);

const SHIFT: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  title: "Volunteer shift",
  startAt: at(11, 0).toISOString(),
  endAt: at(12, 0).toISOString(),
  location: "Food bank",
  everyone: true,
  tagIds: [],
  notify: true,
};

const PIANO: CalendarEvent = {
  ...SHIFT,
  id: "0195f0a0-0000-7000-8000-000000000002",
  title: "Piano lesson",
};

const IDLE_UPDATES = {
  updateWaiting: () => false,
  applyUpdate: () => {},
  checkForUpdate: () => {},
};

const chime = vi.fn();

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-reminder-host-test");

  navigation.push.mockReset();
  chime.mockReset();
});

afterEach(async () => {
  vi.useRealTimers();

  await store.close();
});

function SheetProbe() {
  const { sheet, open } = useSheetHost();

  return (
    <>
      <p>{sheet === null ? "no sheet" : sheet.kind}</p>
      <button type="button" onClick={() => open({ kind: "newnote" })}>
        open
      </button>
    </>
  );
}

async function renderHost(
  start: Date,
  events: readonly CalendarEvent[],
  settings: Partial<AccountSettings> = {},
) {
  await createSettingsRepo(store).update({ idleTimeout: { on: true, minutes: 1 }, ...settings });
  await store.db.events.bulkPut(events.map((event) => synced(event)));

  vi.useFakeTimers({ now: start, shouldAdvanceTime: true });

  const Shell = shellWrapper(store);

  render(
    <Shell>
      <SheetHost>
        <IdleProvider updates={IDLE_UPDATES}>
          <SheetProbe />
          <ReminderHost chime={chime} />
        </IdleProvider>
      </SheetHost>
    </Shell>,
  );

  await screen.findByText("no sheet");
}

const seconds = (n: number) => act(() => vi.advanceTimersByTime(n * 1000));

const strip = () => screen.queryByRole("status", { name: "Reminder" });

describe("ReminderHost", () => {
  it("NOTIF-01 NOTIF-03 shows the strip 15 min before and closes it by itself after 30 s", async () => {
    await renderHost(at(10, 44, 58), [SHIFT]);

    await seconds(1);

    expect(strip()).not.toBeInTheDocument();

    await seconds(1);

    expect(await screen.findByText("In 15 min · 11:00 AM · Everyone · Food bank")).toBeVisible();
    expect(screen.getByText("Volunteer shift")).toBeInTheDocument();

    await seconds(29);

    expect(strip()).toBeInTheDocument();

    await seconds(1);

    expect(strip()).not.toBeInTheDocument();
  });

  it("NOTIF-01 at the start the strip reads Now with the event's span and place", async () => {
    await renderHost(at(10, 59, 59), [{ ...SHIFT, notify: true }]);

    await seconds(1);

    expect(await screen.findByText("Now · 11:00 AM – 12:00 PM · Food bank")).toBeInTheDocument();
  });

  it("NOTIF-05 a new reminder replaces the one showing", async () => {
    const later = { ...PIANO, startAt: at(11, 0, 10).toISOString() };

    await renderHost(at(10, 44, 59), [SHIFT, later]);

    await seconds(1);

    expect(await screen.findByText("Volunteer shift")).toBeInTheDocument();

    await seconds(10);

    expect(await screen.findByText("Piano lesson")).toBeInTheDocument();
    expect(screen.queryByText("Volunteer shift")).not.toBeInTheDocument();
    expect(screen.getAllByRole("status", { name: "Reminder" })).toHaveLength(1);
  });

  it("NOTIF-05 the strip takes no focus, keeps the sheet open and a touch on it doesn't reset idle", async () => {
    await renderHost(at(10, 44, 30), [SHIFT]);

    const opener = screen.getByRole("button", { name: "open" });

    opener.focus();
    fireEvent.click(opener);

    await seconds(30);

    const shown = await screen.findByRole("status", { name: "Reminder" });

    expect(document.activeElement).toBe(opener);
    expect(screen.getByText("newnote")).toBeInTheDocument();

    fireEvent.pointerDown(shown);

    await seconds(29);

    expect(navigation.push).not.toHaveBeenCalled();

    await seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("NOTIF-03 a tap on the strip opens Event details and closes the strip", async () => {
    await renderHost(at(10, 44, 59), [SHIFT]);

    await seconds(1);

    fireEvent.click(await screen.findByRole("status", { name: "Reminder" }));

    expect(screen.getByText("event")).toBeInTheDocument();
    expect(strip()).not.toBeInTheDocument();
  });

  it("NOTIF-04 a group's See all opens Today", async () => {
    await renderHost(at(10, 44, 59), [SHIFT, PIANO]);

    await seconds(1);

    expect(await screen.findByText("In 15 min · 11:00 AM · 2 events")).toBeInTheDocument();
    expect(screen.getByText("Volunteer shift, Piano lesson")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("status", { name: "Reminder" }));

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("NOTIF-05 the chime plays once when the strip shows", async () => {
    await renderHost(at(10, 44, 59), [SHIFT]);

    await seconds(1);

    await screen.findByRole("status", { name: "Reminder" });

    await seconds(5);

    expect(chime).toHaveBeenCalledTimes(1);
  });

  it("NOTIF-05 no chime when Settings › Chime is off", async () => {
    await renderHost(at(10, 44, 59), [SHIFT], { chime: false });

    await seconds(1);

    await screen.findByRole("status", { name: "Reminder" });

    expect(chime).not.toHaveBeenCalled();
  });

  it("NOTIF-05 NOTIF-06 during quiet hours there is no strip and no chime", async () => {
    const { endAt: _end, ...open } = SHIFT;

    await renderHost(at(18, 44, 59), [{ ...open, startAt: at(19, 0).toISOString() }]);

    await seconds(1);

    await screen.findByText("no sheet");

    expect(strip()).not.toBeInTheDocument();
    expect(chime).not.toHaveBeenCalled();
  });
});
