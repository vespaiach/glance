import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, openHarness, putSyncStatus } from "@/data/repos/testHarness";
import type { AccountSettings } from "@/domain/schemas";
import { SheetHost, useSheetHost } from "../SheetHost";
import { IdleProvider, type IdleUpdates } from "./idle";
import { shellWrapper } from "./testShell";

const navigation = vi.hoisted(() => ({
  pathname: "/calendar",
  push: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

const UNAUTHORIZED = {
  online: true,
  weather: { state: "idle" },
  error: "unauthorized",
} as const;

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-idle-provider-test");

  navigation.pathname = "/calendar";
  navigation.push.mockReset();
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
      <input aria-label="Title" />
    </>
  );
}

type IdleOptions = { reload?: (path: string) => void; updates?: IdleUpdates; queued?: boolean };

function fakeUpdates(waiting: boolean) {
  return {
    updateWaiting: vi.fn(() => waiting),
    applyUpdate: vi.fn<(then: () => void) => void>(),
    checkForUpdate: vi.fn(),
  };
}

async function renderIdle(
  start: string,
  settings: Partial<AccountSettings> = {},
  { reload, updates, queued = true }: IdleOptions = {},
) {
  await createSettingsRepo(store).update({ idleTimeout: { on: true, minutes: 1 }, ...settings });

  if (!queued) await store.db.outbox.clear();

  vi.useFakeTimers({ now: new Date(`2026-10-09T${start}`), shouldAdvanceTime: true });

  const Shell = shellWrapper(store);

  const tree = () => (
    <Shell>
      <SheetHost>
        <IdleProvider reload={reload} updates={updates}>
          <SheetProbe />
        </IdleProvider>
      </SheetHost>
    </Shell>
  );

  const { rerender } = render(tree());

  await screen.findByText("no sheet");

  return (pathname: string) => {
    navigation.pathname = pathname;
    rerender(tree());
  };
}

const IDLE_OFF = { on: false, minutes: 1 };

const seconds = (n: number) => act(() => vi.advanceTimersByTime(n * 1000));

describe("IdleProvider", () => {
  it("IDLE-01 returns to Today and discards the sheet after no touch for the timeout", async () => {
    await renderIdle("10:41:00");

    fireEvent.click(screen.getByRole("button", { name: "open" }));

    expect(screen.getByText("newnote")).toBeInTheDocument();

    seconds(59);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/today");
    expect(screen.getByText("no sheet")).toBeInTheDocument();
  });

  it("OFF-07 after a 426 the next idle reloads into the new version, even on Today", async () => {
    navigation.pathname = "/today";

    await putSyncStatus(store, { online: true, weather: { state: "idle" }, error: "outdated" });

    const reload = vi.fn<(path: string) => void>();

    await renderIdle("10:41:00", {}, { reload });

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    await waitFor(() => expect(reload).toHaveBeenCalledWith("/today"));

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("OFF-07 a waiting update applies at the next idle once nothing waits to sync", async () => {
    navigation.pathname = "/today";

    const reload = vi.fn<(path: string) => void>();

    const updates = fakeUpdates(true);

    await renderIdle("10:41:00", {}, { reload, updates, queued: false });

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    await waitFor(() => expect(updates.applyUpdate).toHaveBeenCalledTimes(1));

    expect(reload).not.toHaveBeenCalled();

    updates.applyUpdate.mock.calls[0]?.[0]();

    expect(reload).toHaveBeenCalledExactlyOnceWith("/today");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("OFF-07 a waiting update holds off while changes wait to sync", async () => {
    const updates = fakeUpdates(true);

    await renderIdle("10:41:00", {}, { updates });

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    expect(navigation.push).toHaveBeenCalledWith("/today");
    expect(updates.applyUpdate).not.toHaveBeenCalled();
  });

  it("OFF-07 after a 426 a waiting update applies even with changes waiting", async () => {
    await putSyncStatus(store, { online: true, weather: { state: "idle" }, error: "outdated" });

    const reload = vi.fn<(path: string) => void>();

    const updates = fakeUpdates(true);

    await renderIdle("10:41:00", {}, { reload, updates });

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    await waitFor(() => expect(updates.applyUpdate).toHaveBeenCalledTimes(1));

    expect(reload).not.toHaveBeenCalled();
  });

  it("OFF-07 a 426 looks for the new version right away", async () => {
    await putSyncStatus(store, { online: true, weather: { state: "idle" }, error: "outdated" });

    const updates = fakeUpdates(false);

    await renderIdle("10:41:00", {}, { updates });

    await waitFor(() => expect(updates.checkForUpdate).toHaveBeenCalledTimes(1));
  });

  it("OFF-07 without a 426 idle navigates in place", async () => {
    const reload = vi.fn<(path: string) => void>();

    await renderIdle("10:41:00", {}, { reload });

    seconds(60);

    expect(navigation.push).toHaveBeenCalledWith("/today");
    expect(reload).not.toHaveBeenCalled();
  });

  it("IDLE-01 a touch restarts the timer", async () => {
    await renderIdle("10:41:00");

    seconds(50);

    fireEvent.pointerDown(document.body);

    seconds(50);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(10);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("IDLE-01 stays on Today when it is already there", async () => {
    navigation.pathname = "/today";

    await renderIdle("10:41:00");

    seconds(120);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("IDLE-01 follows the chosen minutes", async () => {
    await renderIdle("10:41:00", { idleTimeout: { on: true, minutes: 15 } });

    seconds(899);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("IDLE-01 off turns the timeout off, whatever minutes it keeps", async () => {
    await renderIdle("10:41:00", { idleTimeout: IDLE_OFF });

    seconds(600);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("IDLE-02 pauses while a text field is focused", async () => {
    await renderIdle("10:41:00");

    act(() => screen.getByRole("textbox", { name: "Title" }).focus());

    seconds(300);

    expect(navigation.push).not.toHaveBeenCalled();

    act(() => screen.getByRole("textbox", { name: "Title" }).blur());

    seconds(59);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("IDLE-03 returns to Ambient during ambient hours", async () => {
    navigation.pathname = "/today";

    await renderIdle("21:00:00");

    seconds(60);

    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });

  it("AMB-05 enters Ambient at the schedule start", async () => {
    navigation.pathname = "/today";

    await renderIdle("17:59:30", { idleTimeout: IDLE_OFF });

    seconds(29);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });

  it("AMB-05 weekends differ: Friday night waits for the Fri & Sat dim time", async () => {
    navigation.pathname = "/today";

    const ambient = {
      mode: "split",
      all: { start: "18:00", end: "07:30" },
      wknd: { start: "21:00", end: "09:00" },
    } as const;

    await renderIdle("17:59:30", { idleTimeout: IDLE_OFF, ambient });

    seconds(60);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("AMB-05 Off never enters Ambient", async () => {
    navigation.pathname = "/today";

    const ambient = {
      mode: "off",
      all: { start: "18:00", end: "07:30" },
      wknd: { start: "21:00", end: "09:00" },
    } as const;

    await renderIdle("17:59:30", { idleTimeout: IDLE_OFF, ambient });

    seconds(60);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("AMB-05 leaves Ambient for Today at the schedule end", async () => {
    navigation.pathname = "/ambient";

    await renderIdle("07:29:30", { idleTimeout: IDLE_OFF });

    seconds(30);

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/today"));
  });

  it("AMB-05 the schedule end leaves other views alone", async () => {
    navigation.pathname = "/calendar";

    await renderIdle("07:29:30", { idleTimeout: IDLE_OFF });

    seconds(30);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("IDLE-03 after a wake tap during ambient hours, idle returns to Ambient", async () => {
    navigation.pathname = "/ambient";

    const showPath = await renderIdle("21:00:00");

    seconds(30);

    fireEvent.pointerDown(document.body);

    showPath("/today");

    seconds(59);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });

  it("SET-06 a previewed Ambient returns to Today after the idle timeout outside ambient hours", async () => {
    navigation.pathname = "/ambient";

    await renderIdle("10:41:00");

    seconds(60);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("AMB-05 the schedule start goes to Ambient once when idle is due at the same moment", async () => {
    navigation.pathname = "/today";

    await renderIdle("17:59:00");

    seconds(60);

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });

  it("SIGNIN-13 signed out by the server, idle opens the signed-out form", async () => {
    await putSyncStatus(store, UNAUTHORIZED);

    await renderIdle("10:41:00");

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    expect(navigation.push).toHaveBeenCalledExactlyOnceWith("/signin");
  });

  it("SIGNIN-13 signed out by the server, idle during ambient hours goes to Ambient", async () => {
    await putSyncStatus(store, UNAUTHORIZED);

    await renderIdle("21:00:00");

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    expect(navigation.push).toHaveBeenCalledExactlyOnceWith("/ambient");
  });

  it("AMB-07 signed out by the server, the schedule end leaves Ambient for the signed-out form", async () => {
    navigation.pathname = "/ambient";

    await putSyncStatus(store, UNAUTHORIZED);

    await renderIdle("07:29:00", { idleTimeout: IDLE_OFF });

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/signin"));
  });

  it("SIGNIN-13 signed out by the server, idle leaves the open sheet for the route change to discard", async () => {
    await putSyncStatus(store, UNAUTHORIZED);

    await renderIdle("10:41:00");

    fireEvent.click(screen.getByRole("button", { name: "open" }));

    await act(() => vi.advanceTimersByTimeAsync(200));

    seconds(60);

    expect(navigation.push).toHaveBeenCalledWith("/signin");
    expect(screen.getByText("newnote")).toBeInTheDocument();
  });
});
