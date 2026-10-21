import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, putSyncStatus, synced } from "@/data/repos/testHarness";
import type { AccountSettings, CalendarEvent, Tag } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { TimeZoneProvider } from "@/shell/providers/timeZone";
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
  everyone: true,
  tagIds: [],
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

function renderSheet(
  initial: SheetRequest,
  overrides: Partial<AccountSettings> = {},
  timeZone?: string,
) {
  const Shell = shellWrapper(store, { frozenAt: NOW, overrides });

  const sheets = (children: ReactNode) => (
    <SeasonProvider>
      <NetworkProvider>
        <SheetHost initial={initial}>{children}</SheetHost>
      </NetworkProvider>
    </SeasonProvider>
  );

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      {timeZone ? (
        <TimeZoneProvider timeZone={timeZone}>{sheets(children)}</TimeZoneProvider>
      ) : (
        sheets(children)
      )}
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

test("EVT-01 an edit request opens Edit event filled from the event", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

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

test("TL-08 a new event request from a free slot opens at the slot's times", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09", times: { start: 675, end: 735 } });

  expect(
    await screen.findByRole("button", { name: "Starts, 11:15 AM. Change" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ends, 12:15 PM. Change" })).toBeInTheDocument();
});

test("TPK-02 the time fixture is the sheet's first state", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09", time: "end" });

  expect(await screen.findByRole("group", { name: "End time" })).toBeInTheDocument();
});

test("TPK-09 the Clock setting drives the time fields", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true }, { clock: "24h" });

  expect(await screen.findByRole("button", { name: "Starts, 12:00. Change" })).toBeInTheDocument();
});

test("EVT-05 offline the sheet saves for later", async () => {
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderSheet({ kind: "newevent", day: "2026-10-09" });

  expect(await screen.findByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("EVT-06 Delete event removes the event and closes the sheet", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

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

test("§8.9 a request with discard opens on Discard changes?", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09", discard: true });

  expect(await screen.findByRole("alert")).toHaveTextContent("This event won’t be added.");
});

test("§8.9 Cancel on a changed event asks, and Discard closes the sheet without saving", async () => {
  await store.db.events.put(synced(LUNCH));
  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.type(await screen.findByLabelText("Title"), "!");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent("");
  expect((await store.db.events.get(LUNCH.id))?.title).toBe(LUNCH.title);
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
    everyone: true,
    tagIds: [],
  });
  expect(saved?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
});

test("EVT-07 Save keeps the event's id and day", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.type(await screen.findByLabelText("Title"), "!");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await waitFor(async () =>
    expect(await store.db.events.get(LUNCH.id)).toMatchObject({
      ...LUNCH,
      title: "Lunch with Aunt Rosa!",
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

const NO_SCHOOL: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000010",
  title: "No school · teacher planning day",
  startAt: "2026-10-16T00:00:00.000Z",
  allDay: true,
  location: "Lincoln Elementary",
  everyone: true,
  tagIds: [],
};

test("D21 an all-day event opens and saves on its own date in a zone behind UTC", async () => {
  await store.db.events.put(synced(NO_SCHOOL));

  renderSheet({ kind: "event", id: NO_SCHOOL.id, edit: true }, {}, "America/Los_Angeles");

  expect(await screen.findByText("Friday, Oct 16")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "All day" })).toHaveAttribute("aria-pressed", "true");

  await userEvent.type(screen.getByLabelText("Title"), "!");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () =>
    expect(await store.db.events.get(NO_SCHOOL.id)).toMatchObject({
      ...NO_SCHOOL,
      title: "No school · teacher planning day!",
    }),
  );
});

const MOM: Tag = {
  id: "0195f0a0-0000-7000-8000-000000000501",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const DAD: Tag = {
  id: "0195f0a0-0000-7000-8000-000000000502",
  name: "Dad",
  color: "mint",
  createdAt: "2026-10-02T15:00:00.000Z",
};

test("EVT-11 a new event request for some tags starts with them and saves their ids", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);

  renderSheet({
    kind: "newevent",
    day: "2026-10-12",
    who: { everyone: false, tagIds: [DAD.id] },
  });

  await waitFor(() => expect(pills()).toEqual(["Remove Dad"]));

  await userEvent.type(screen.getByLabelText("Title"), "Haircut");
  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  await waitFor(async () =>
    expect(await store.db.events.toArray()).toMatchObject([{ everyone: false, tagIds: [DAD.id] }]),
  );
});

function pills() {
  return within(screen.getByRole("group", { name: "People on this event" }))
    .queryAllByRole("button", { name: /^Remove / })
    .map((button) => button.getAttribute("aria-label"));
}

test("EVT-11 an everyone event opens with every tag as a pill", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await screen.findByRole("dialog", { name: "Edit event" });

  expect(pills()).toEqual(["Remove Mom", "Remove Dad"]);
});

test("EVT-11 saving with every tag on it stores everyone", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);
  await store.db.events.put(synced({ ...LUNCH, everyone: false, tagIds: [DAD.id] }));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.type(await screen.findByLabelText("Who"), "mom{Enter}");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () =>
    expect(await store.db.events.get(LUNCH.id)).toMatchObject({ everyone: true, tagIds: [] }),
  );
});

test("FAM-04 Add member writes the tag through the outbox and puts it on the event", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);

  renderSheet({ kind: "newevent", day: "2026-10-12", who: { everyone: false, tagIds: [DAD.id] } });

  await userEvent.type(await screen.findByLabelText("Title"), "Haircut");
  await userEvent.type(screen.getByLabelText("Who"), "Grandma");
  await userEvent.click(screen.getByRole("button", { name: "Add member" }));

  await waitFor(() => expect(pills()).toEqual(["Remove Dad", "Remove Grandma"]));

  const grandma = await store.db.tags.filter((one) => one.name === "Grandma").first();

  expect(grandma).toMatchObject({ color: "lilac", createdAt: NOW.toISOString() });
  expect(await store.db.outbox.filter((one) => one.entity === "tags").count()).toBe(1);

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  await waitFor(async () =>
    expect(await store.db.events.toArray()).toMatchObject([
      { everyone: false, tagIds: [DAD.id, grandma?.id] },
    ]),
  );
});

test("EVT-02 Notes save trimmed", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.type(await screen.findByLabelText("Notes"), "  Bring a gift  ");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () =>
    expect((await store.db.events.get(LUNCH.id))?.notes).toBe("Bring a gift"),
  );
});

describe("Event details", () => {
  const CALL: CalendarEvent = {
    ...LUNCH,
    id: "0195f0a0-0000-7000-8000-000000000002",
    title: "Grandma’s video call",
    startAt: new Date(2026, 9, 9, 10, 30).toISOString(),
    endAt: new Date(2026, 9, 9, 11, 15).toISOString(),
  };

  const DROP_OFF: CalendarEvent = {
    ...LUNCH,
    id: "0195f0a0-0000-7000-8000-000000000001",
    title: "School drop-off",
    startAt: new Date(2026, 9, 9, 7, 45).toISOString(),
    endAt: new Date(2026, 9, 9, 8, 15).toISOString(),
  };

  test("EVT-09 tapping an event opens Event details with Edit", async () => {
    await store.db.events.put(synced(LUNCH));

    renderSheet({ kind: "event", id: LUNCH.id });

    expect(await screen.findByRole("dialog", { name: "Lunch with Aunt Rosa" })).toBeInTheDocument();
    expect(screen.getByText("Friday, Oct 9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByText("Happening now")).not.toBeInTheDocument();
  });

  test("EVT-09 a running event today shows Happening now", async () => {
    await store.db.events.put(synced(CALL));

    renderSheet({ kind: "event", id: CALL.id });

    expect(await screen.findByText("Happening now")).toBeInTheDocument();
  });

  test("EVT-09 an ended event opens read-only details even on an edit request", async () => {
    await store.db.events.put(synced(DROP_OFF));

    renderSheet({ kind: "event", id: DROP_OFF.id, edit: true });

    expect(await screen.findByRole("dialog", { name: "School drop-off" })).toBeInTheDocument();
    expect(screen.getByText("Ended")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  test("EVT-07 Save from details writes the event and returns to its details", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id });

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.type(screen.getByLabelText("Title"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("dialog", { name: "Lunch with Aunt Rosa!" })).toBeInTheDocument();
    await waitFor(async () =>
      expect((await store.db.events.get(LUNCH.id))?.title).toBe("Lunch with Aunt Rosa!"),
    );
  });
});
