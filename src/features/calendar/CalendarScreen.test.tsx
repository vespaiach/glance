import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import type { CalendarEvent } from "@/domain/schemas";
import { EventSheetScreen } from "@/features/events";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { SheetHost, useSheetHost } from "@/shell/SheetHost";
import { CalendarScreen } from "./CalendarScreen";

vi.mock("next/navigation", () => ({
  usePathname: () => "/calendar",
  useRouter: () => ({ push: () => {}, prefetch: () => {} }),
}));

const NOW = new Date(2026, 9, 9, 10, 41);

const at = (month: number, day: number, h: number, m = 0) =>
  new Date(2026, month, day, h, m).toISOString();

function event(n: number, title: string, startAt: string): CalendarEvent {
  return { id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`, title, startAt, tone: 1 };
}

const CALL = event(1, "Grandma’s video call", at(9, 9, 10, 30));

const DENTIST = event(2, "Dentist", at(9, 14, 16));

const NEXT_YEAR = event(3, "New Year brunch", at(12, 1, 11));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-calendar-screen-test");

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

function renderCalendar() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SheetHost>{children}</SheetHost>
    </Shell>
  );

  return render(
    <>
      <CalendarScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

test("CAL-03 opens on the current month, named without the year", async () => {
  renderCalendar();

  expect(await screen.findByRole("heading", { name: "October" })).toBeInTheDocument();
});

test("CAL-01 today is selected and its events are listed", async () => {
  await store.db.events.bulkPut([synced(CALL), synced(DENTIST)]);

  renderCalendar();

  expect(await screen.findByRole("heading", { name: "Friday, Oct 9" })).toBeInTheDocument();
  expect(await screen.findByText("1 event")).toBeInTheDocument();
  expect(screen.getByText("Grandma’s video call")).toBeInTheDocument();
  expect(screen.queryByText("Dentist")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Friday, October 9" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("CAL-04 a free day says so when other days have events", async () => {
  await store.db.events.put(synced(NEXT_YEAR));

  renderCalendar();

  expect(await screen.findByText("Nothing scheduled. A free day.")).toBeInTheDocument();
  expect(screen.getByText("No events")).toBeInTheDocument();
});

test("CAL-04 with no events at all the day shows the empty calendar tile", async () => {
  renderCalendar();

  expect(await screen.findByText("The calendar is empty")).toBeInTheDocument();
});

test("CAL-05 Add event opens New event on the selected day", async () => {
  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Add event" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "newevent", day: "2026-10-09" }),
  );
});

test("CAL-05 tapping a row opens Edit event", async () => {
  await store.db.events.put(synced(CALL));

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: /Grandma’s video call/ }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "event", id: CALL.id }),
  );
});

test("EVT-07 an event added on the Calendar lists on its day and the count updates", async () => {
  await store.db.events.put(synced(CALL));

  const Shell = shellWrapper(store, { frozenAt: NOW });

  render(
    <Shell>
      <SeasonProvider>
        <NetworkProvider>
          <SheetHost>
            <CalendarScreen />
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
  expect(screen.getByText("2 events")).toBeInTheDocument();
});
