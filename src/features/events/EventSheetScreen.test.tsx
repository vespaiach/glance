import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, putSyncStatus, synced } from "@/data/repos/testHarness";
import type { AccountSettings, CalendarEvent } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { SheetHost, type SheetRequest, useSheetHost } from "@/shell/SheetHost";
import { EventSheetScreen } from "./EventSheetScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/calendar" }));

const NOW = new Date(2026, 9, 9, 10, 41);

const LUNCH: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  title: "Lunch with Aunt Rosa",
  startAt: new Date(2026, 9, 9, 12, 0).toISOString(),
  endAt: new Date(2026, 9, 9, 13, 0).toISOString(),
  location: "Café Lumen",
  tone: 2,
};

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-event-sheet-test");

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

function renderSheet(initial: SheetRequest, overrides: Partial<AccountSettings> = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW, overrides });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SeasonProvider>
        <NetworkProvider>
          <SheetHost initial={initial}>{children}</SheetHost>
        </NetworkProvider>
      </SeasonProvider>
    </Shell>
  );

  return render(
    <>
      <EventSheetScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

test("EVT-01 an event request opens Edit event filled from the event", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id });

  expect(await screen.findByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
  expect(screen.getByText("Friday, Oct 9")).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("Lunch with Aunt Rosa");
  expect(screen.getByRole("button", { name: "Starts, 12:00 PM. Change" })).toBeInTheDocument();
});

test("TPK-05 a new event request opens New event on its day at the next half hour", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-12" });

  expect(await screen.findByRole("dialog", { name: "New event" })).toBeInTheDocument();
  expect(screen.getByText("Monday, Oct 12")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Starts, 11:00 AM. Change" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ends, 12:00 PM. Change" })).toBeInTheDocument();
});

test("TPK-02 the time fixture is the sheet's first state", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09", time: "end" });

  expect(await screen.findByRole("group", { name: "End time" })).toBeInTheDocument();
});

test("TPK-09 the Clock setting drives the time fields", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id }, { clock: "24h" });

  expect(await screen.findByRole("button", { name: "Starts, 12:00. Change" })).toBeInTheDocument();
});

test("EVT-05 offline the sheet saves for later", async () => {
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderSheet({ kind: "newevent", day: "2026-10-09" });

  expect(await screen.findByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("EVT-06 Delete event removes the event and closes the sheet", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id });

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete event" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent("");
  await waitFor(async () => expect((await store.db.events.get(LUNCH.id))?.deletedAt).toBeDefined());
});

test("SHEET Cancel closes the sheet", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09" });

  await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("tech§4.3 a note request renders no event sheet", () => {
  renderSheet({ kind: "newnote" });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("EVT-07 Add event queues the new event on the request's day and closes the sheet", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-12" });

  await userEvent.type(await screen.findByLabelText("Title"), "Picnic");
  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await waitFor(async () => expect(await store.db.outbox.count()).toBe(1));

  const [saved] = await store.db.events.toArray();

  expect(saved).toMatchObject({
    title: "Picnic",
    startAt: new Date(2026, 9, 12, 11, 0).toISOString(),
    endAt: new Date(2026, 9, 12, 12, 0).toISOString(),
    tone: 1,
  });
  expect(saved?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
});

test("EVT-07 Save keeps the event's id and day", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id });

  await userEvent.click(await screen.findByRole("button", { name: "Alert" }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await waitFor(async () =>
    expect(await store.db.events.get(LUNCH.id)).toMatchObject({
      ...LUNCH,
      tone: "accent",
      version: 1,
    }),
  );
});

test("EVT-03 a failed Save keeps the sheet open and writes nothing", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-12" });

  await userEvent.click(await screen.findByRole("button", { name: "Add event" }));

  expect(screen.getByRole("dialog", { name: "New event" })).toBeInTheDocument();
  expect(await store.db.events.count()).toBe(0);
});
