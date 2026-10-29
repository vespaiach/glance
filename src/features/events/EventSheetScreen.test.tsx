import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, openHarness, putSyncStatus, synced } from "@/data/repos/testHarness";
import type { AccountSettings, CalendarEvent, Tag, Weather } from "@/domain/schemas";
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
  notify: true,
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

const NO_SCHOOL: CalendarEvent = {
  id: "0195f0a0-0000-7000-8000-000000000010",
  title: "No school · teacher planning day",
  startAt: "2026-10-16T00:00:00.000Z",
  allDay: true,
  location: "Lincoln Elementary",
  everyone: true,
  tagIds: [],
  notify: true,
};

function setWidth(width: number) {
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: width >= Number(query.match(/\d+/)?.[0]),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function word(name: string) {
  return screen.getByRole("button", { name });
}

function openSheet() {
  return screen.getByRole("status", { name: "Open sheet" });
}

async function typeTitle(text: string) {
  await userEvent.type(await screen.findByRole("textbox", { name: "What’s happening" }), text);
}

test("EVT-01 an edit request opens Edit event filled from the event, on the title", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  expect(await screen.findByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
  expect(word("Day: Fri, Oct 9. Change")).toBeInTheDocument();
  expect(word("Starts: 12:00 PM. Change")).toBeInTheDocument();
  expect(word("Where: Café Lumen. Change")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "What’s happening" })).toHaveValue(LUNCH.title);
});

test("EVT-03 a new event opens on its day with the TPK-05 defaults as placeholders", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-12" });

  expect(await screen.findByRole("dialog", { name: "New event" })).toBeInTheDocument();
  expect(word("Day: not set. Change")).toHaveTextContent("Mon, Oct 12");
  expect(word("Starts: not set. Change")).toHaveTextContent("11:00 AM");
  expect(word("Ends: not set. Change")).toHaveTextContent("12:00 PM");
});

test("TL-08 a new event from a free slot opens at the slot's times", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09", times: { start: 675, end: 735 } });

  expect(await screen.findByRole("button", { name: "Starts: not set. Change" })).toHaveTextContent(
    "11:15 AM",
  );
  expect(word("Ends: not set. Change")).toHaveTextContent("12:15 PM");
});

test("EVT-03 Save is disabled until the title has text", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-12" });

  expect(await screen.findByRole("button", { name: "Save event" })).toBeDisabled();

  await typeTitle("  ");

  expect(screen.getByRole("button", { name: "Save event" })).toBeDisabled();

  await typeTitle("Picnic");

  expect(screen.getByRole("button", { name: "Save event" })).toBeEnabled();
});

test("EVT-07 Save event queues the new event on its day and closes the page", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-12" });

  await typeTitle("Picnic");
  await userEvent.click(screen.getByRole("button", { name: "Save event" }));

  expect(openSheet()).toHaveTextContent("");
  await waitFor(async () => expect(await store.db.outbox.count()).toBe(1));

  const [saved] = await store.db.events.toArray();

  expect(saved).toMatchObject({
    title: "Picnic",
    startAt: new Date(2026, 9, 12, 11, 0).toISOString(),
    endAt: new Date(2026, 9, 12, 12, 0).toISOString(),
    everyone: true,
    tagIds: [],
    notify: true,
  });
  expect(saved?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
});

test("EVT-07 Save keeps the event's id and closes the page", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await typeTitle("!");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(openSheet()).toHaveTextContent("");
  await waitFor(async () =>
    expect(await store.db.events.get(LUNCH.id)).toMatchObject({
      ...LUNCH,
      title: "Lunch with Aunt Rosa!",
    }),
  );
});

test("EVT-12 a day picked in the Day picker moves the event and keeps its times", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.click(await screen.findByRole("button", { name: "Day: Fri, Oct 9. Change" }));
  await userEvent.click(screen.getByRole("button", { name: "Sat, October 10" }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const saved = await store.db.events.get(LUNCH.id);

    expect(saved?.startAt).toBe(new Date(2026, 9, 10, 12, 0).toISOString());
    expect(saved?.endAt).toBe(new Date(2026, 9, 10, 13, 0).toISOString());
  });
});

test("EVT-06 Delete, then Delete event, removes the event and closes the page", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete event" }));

  expect(openSheet()).toHaveTextContent("");
  await waitFor(async () => expect((await store.db.events.get(LUNCH.id))?.deletedAt).toBeDefined());
});

test("EVT-05 Back with no changes closes the page at once", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09" });

  await userEvent.click(await screen.findByRole("button", { name: "Back" }));

  expect(openSheet()).toHaveTextContent("");
});

test("EVT-05 Back with changes asks, and Keep editing brings the actions back", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09" });

  await typeTitle("Picnic");
  await userEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(screen.getByText("Discard changes?")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));

  expect(screen.getByRole("button", { name: "Save event" })).toBeEnabled();
  expect(screen.getByRole("textbox", { name: "What’s happening" })).toHaveValue("Picnic");
});

test("EVT-05 Discard closes the page without saving", async () => {
  await store.db.events.put(synced(LUNCH));
  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await typeTitle("!");
  await userEvent.click(screen.getByRole("button", { name: "Back" }));
  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(openSheet()).toHaveTextContent("");
  expect((await store.db.events.get(LUNCH.id))?.title).toBe(LUNCH.title);
});

test("EVT-05 Escape is Back", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-09" });

  await typeTitle("Picnic");
  await userEvent.keyboard("{Escape}");

  expect(screen.getByText("Discard changes?")).toBeInTheDocument();
});

test("tech§4.3 a note request renders no event page", () => {
  renderSheet({ kind: "newnote" });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("NOTIF-09 the Notification switch saves with the event and reads back off", async () => {
  await store.db.events.put(synced(LUNCH));

  const first = renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.click(await screen.findByRole("switch", { name: "Notification on. Turn off" }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => expect((await store.db.events.get(LUNCH.id))?.notify).toBe(false));

  first.unmount();
  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  expect(await screen.findByRole("switch", { name: "Notification off. Turn on" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("NOTIF-09 a new event saves with its notification on, whatever the lead time", async () => {
  renderSheet({ kind: "newevent", day: "2026-10-12" }, { notifyLead: "off" });

  await typeTitle("Picnic");
  await userEvent.click(screen.getByRole("button", { name: "Save event" }));

  await waitFor(async () => expect(await store.db.outbox.count()).toBe(1));
  expect((await store.db.events.toArray())[0]?.notify).toBe(true);
});

test("EVT-12 Every week saves the event as weekly and One day saves it without repeat", async () => {
  await store.db.events.put(synced(LUNCH));

  const first = renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.click(await screen.findByRole("button", { name: /^Day: / }));
  await userEvent.click(screen.getByRole("tab", { name: "Every week" }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => expect((await store.db.events.get(LUNCH.id))?.repeat).toBe("weekly"));

  first.unmount();
  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.click(await screen.findByRole("button", { name: /^Day: every / }));
  await userEvent.click(screen.getByRole("tab", { name: "One day" }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  await userEvent.click(screen.getByRole("button", { name: "All events in the series" }));

  await waitFor(async () =>
    expect(await store.db.events.get(LUNCH.id)).not.toHaveProperty("repeat"),
  );
});

test("TPK-09 offline Save reads Save for later", async () => {
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderSheet({ kind: "newevent", day: "2026-10-09" });

  expect(await screen.findByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("TPK-09 the Clock setting drives the sentence", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true }, { clock: "24h" });

  expect(await screen.findByRole("button", { name: "Starts: 12:00. Change" })).toBeInTheDocument();
});

test("D21 an all-day event opens and saves on its own date in a zone behind UTC", async () => {
  await store.db.events.put(synced(NO_SCHOOL));

  renderSheet({ kind: "event", id: NO_SCHOOL.id, edit: true }, {}, "America/Los_Angeles");

  expect(await screen.findByRole("button", { name: "Day: Fri, Oct 16. Change" })).toBeVisible();
  expect(word("Starts: all day. Change")).toBeInTheDocument();

  await typeTitle("!");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () =>
    expect(await store.db.events.get(NO_SCHOOL.id)).toMatchObject({
      ...NO_SCHOOL,
      title: "No school · teacher planning day!",
    }),
  );
});

test("EVT-11 a new event for some tags starts with them and saves their ids", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);

  renderSheet({ kind: "newevent", day: "2026-10-12", who: { everyone: false, tagIds: [DAD.id] } });

  expect(
    await screen.findByRole("button", { name: "Who it’s for: not set. Change" }),
  ).toHaveTextContent("Dad");

  await typeTitle("Haircut");
  await userEvent.click(screen.getByRole("button", { name: "Save event" }));

  await waitFor(async () =>
    expect(await store.db.events.toArray()).toMatchObject([{ everyone: false, tagIds: [DAD.id] }]),
  );
});

test("EVT-11 saving with every tag on it stores everyone", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);
  await store.db.events.put(synced({ ...LUNCH, everyone: false, tagIds: [DAD.id] }));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.click(await screen.findByRole("button", { name: "Who it’s for: Dad. Change" }));
  await userEvent.click(screen.getByRole("button", { name: "Mom" }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () =>
    expect(await store.db.events.get(LUNCH.id)).toMatchObject({ everyone: true, tagIds: [] }),
  );
});

test("FAM-04 a member added in Who is written through the tags repo and saved with the event", async () => {
  await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);

  renderSheet({ kind: "newevent", day: "2026-10-12", who: { everyone: false, tagIds: [DAD.id] } });

  await typeTitle("Haircut");
  await userEvent.click(screen.getByRole("button", { name: "Who it’s for: not set. Change" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Add a person" }), "Grandma");
  await userEvent.click(screen.getByRole("button", { name: "Add member" }));

  const grandma = await waitFor(async () => {
    const tag = await store.db.tags.filter((one) => one.name === "Grandma").first();

    expect(tag).toMatchObject({ createdAt: NOW.toISOString() });

    return tag;
  });

  expect(await store.db.outbox.filter((one) => one.entity === "tags").count()).toBe(1);

  await userEvent.click(screen.getByRole("button", { name: "Save event" }));

  await waitFor(async () =>
    expect(await store.db.events.toArray()).toMatchObject([
      { everyone: false, tagIds: [DAD.id, grandma?.id] },
    ]),
  );
});

test("EVT-12 Notes save trimmed", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "event", id: LUNCH.id, edit: true });

  await userEvent.click(await screen.findByRole("button", { name: "Add notes" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Notes" }), "  Bring a gift  ");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () =>
    expect((await store.db.events.get(LUNCH.id))?.notes).toBe("Bring a gift"),
  );
});

test("EVT-12 the title picker offers recent titles from the local events", async () => {
  await store.db.events.put(synced(LUNCH));

  renderSheet({ kind: "newevent", day: "2026-10-12" });

  await userEvent.click(await screen.findByRole("button", { name: LUNCH.title }));

  expect(screen.getByRole("button", { name: "Save event" })).toBeEnabled();
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

  test("EVT-09 tapping an event opens its details with the status title and Edit", async () => {
    await store.db.events.put(synced(LUNCH));

    renderSheet({ kind: "event", id: LUNCH.id });

    expect(await screen.findByRole("dialog", { name: "In 1 hr 19 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  test("EVT-09 a running event today shows Happening now", async () => {
    await store.db.events.put(synced(CALL));

    renderSheet({ kind: "event", id: CALL.id });

    expect(await screen.findByRole("dialog", { name: "Happening now" })).toBeInTheDocument();
  });

  test("EVT-09 an ended event opens locked details even on an edit request", async () => {
    await store.db.events.put(synced(DROP_OFF));

    renderSheet({ kind: "event", id: DROP_OFF.id, edit: true });

    expect(await screen.findByRole("dialog", { name: "Ended" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByText("This event has ended and can’t be changed.")).toBeInTheDocument();
  });

  test("EVT-07 Save from details writes the event and returns to its details", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id });

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await typeTitle("!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("dialog", { name: "In 1 hr 19 min" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What’s happening: Lunch with Aunt Rosa!. Edit" }),
    ).toBeInTheDocument();
    await waitFor(async () =>
      expect((await store.db.events.get(LUNCH.id))?.title).toBe("Lunch with Aunt Rosa!"),
    );
  });

  test("EVT-10 tapping a value opens Edit event on that word's picker", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id });

    await userEvent.click(await screen.findByRole("button", { name: "Where: Café Lumen. Edit" }));

    expect(screen.getByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Where" })).toHaveValue("Café Lumen");
  });

  test("EVT-10 Edit opens Edit event on the title picker", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id });

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));

    expect(screen.getByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "What’s happening" })).toHaveValue(LUNCH.title);
  });

  test("EVT-09 an ended event's values are not tappable", async () => {
    await store.db.events.put(synced(DROP_OFF));
    renderSheet({ kind: "event", id: DROP_OFF.id });

    await screen.findByRole("dialog", { name: "Ended" });

    expect(screen.queryByRole("button", { name: /Edit$/ })).not.toBeInTheDocument();
    expect(screen.getByText("School drop-off")).toBeInTheDocument();
  });

  test("EVT-10 Discard returns to details without saving", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id });

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await typeTitle("!");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.getByRole("dialog", { name: "In 1 hr 19 min" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What’s happening: Lunch with Aunt Rosa. Edit" }),
    ).toBeInTheDocument();
  });

  test("EVT-10 Back with no changes returns to details", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id });

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("dialog", { name: "In 1 hr 19 min" })).toBeInTheDocument();
  });

  test("EVT-09 Back on details closes the page", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id });

    await userEvent.click(await screen.findByRole("button", { name: "Back" }));

    await waitFor(() => expect(openSheet()).toBeEmptyDOMElement());
  });
});

describe("day preview and Same time", () => {
  const FORECAST = {
    location: "Portland, OR",
    fetchedAt: new Date(2026, 9, 9, 10, 0).toISOString(),
    daily: [{ date: "2026-10-09", icon: "cloud-sun", high: 68, low: 51 }],
    hourly: [{ time: new Date(2026, 9, 9, 12).toISOString(), icon: "cloud", temp: 52 }],
  } as Weather;

  const PORTLAND = { name: "Portland", region: "Oregon", lat: 45.5, lon: -122.7 };

  const PIANO: CalendarEvent = {
    id: "0195f0a0-0000-7000-8000-000000000011",
    title: "Piano lesson",
    startAt: new Date(2026, 9, 9, 12, 30).toISOString(),
    endAt: new Date(2026, 9, 9, 13, 30).toISOString(),
    everyone: false,
    tagIds: [DAD.id],
    notify: true,
  };

  async function openLunch(width: number, edit = true) {
    setWidth(width);
    await createSettingsRepo(store).update({ weatherLocation: PORTLAND });
    await store.db.weather.put({ ...FORECAST, accountId: store.accountId });
    await store.db.tags.bulkPut([synced(MOM), synced(DAD)]);
    await store.db.events.bulkPut([LUNCH, PIANO].map(synced));

    renderSheet({ kind: "event", id: LUNCH.id, edit: edit || undefined });

    await screen.findByRole("dialog", { name: edit ? "Edit event" : "In 1 hr 19 min" });
  }

  test("EVT-13 large shows the day preview with the other plans at this time", async () => {
    await openLunch(1920);

    const preview = await screen.findByRole("complementary");

    expect(await within(preview).findByText("52°")).toBeInTheDocument();
    expect(within(preview).getByText("Piano lesson")).toBeInTheDocument();
    expect(screen.queryByText("Same time:")).not.toBeInTheDocument();
  });

  test("EVT-13 normal shows the Same time line instead of the day preview", async () => {
    await openLunch(1024);

    expect(await screen.findByRole("status", { name: "" })).toHaveTextContent(
      "Same time: Dad is also at Piano lesson, 12:30 PM – 1:30 PM",
    );
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  test("EVT-09 details show the forecast and the plans at this time below the sentence", async () => {
    await openLunch(1024, false);

    const facts = await screen.findByRole("region", { name: "Forecast and other plans" });

    expect(within(facts).getByText("Forecast · Fri, Oct 9")).toBeInTheDocument();
    expect(await within(facts).findByText("52°")).toBeInTheDocument();
    expect(within(facts).getByText("Also at this time · 1")).toBeInTheDocument();
    expect(within(facts).getByText("Piano lesson")).toBeInTheDocument();
  });

  test("EVT-09 all-day details read Also that day", async () => {
    setWidth(390);
    await store.db.events.put(synced(NO_SCHOOL));

    renderSheet({ kind: "event", id: NO_SCHOOL.id });

    const facts = await screen.findByRole("region", { name: "Forecast and other plans" });

    expect(within(facts).getByText("Also that day")).toBeInTheDocument();
    expect(within(facts).getByText("Nothing else that day.")).toBeInTheDocument();
  });

  test("EVT-13 small shows neither", async () => {
    await openLunch(390);

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.queryByText("Same time:")).not.toBeInTheDocument();
  });
});

describe("EVT-14 this event or the series", () => {
  const WEEKLY: CalendarEvent = { ...LUNCH, repeat: "weekly" };

  const WEEK_2 = "2026-10-16";

  async function editWeek() {
    await store.db.events.put(synced(WEEKLY));

    renderSheet({ kind: "event", id: WEEKLY.id, edit: true, day: WEEK_2 });

    await screen.findByRole("dialog", { name: "Edit event" });
  }

  function seriesDialog() {
    return screen.getByRole("dialog", { name: /repeating event\?$/ });
  }

  function noSeriesDialog() {
    expect(screen.queryByRole("dialog", { name: /repeating event\?$/ })).not.toBeInTheDocument();
  }

  test("EVT-14 Event details open the tapped week, not the first", async () => {
    await store.db.events.put(synced(WEEKLY));

    renderSheet({ kind: "event", id: WEEKLY.id, day: WEEK_2 });

    expect(await screen.findByRole("dialog", { name: "In 7 days" })).toBeInTheDocument();
    expect(screen.getByText("Every week · from Fri, Oct 9")).toBeInTheDocument();
  });

  test("EVT-14 Delete on a weekly event asks which, as written", async () => {
    await editWeek();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = seriesDialog();

    expect(within(dialog).getByText("Repeats every Friday")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading")).toHaveTextContent("Delete a repeating event?");
    expect(dialog).toHaveTextContent(
      "Lunch with Aunt Rosa repeats every Friday. Delete only the one on Fri, Oct 16, or every event in the series.",
    );
    expect(screen.queryByRole("button", { name: "Delete event" })).not.toBeInTheDocument();
  });

  test("EVT-14 deleting This event only hides only that week", async () => {
    await editWeek();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(within(seriesDialog()).getByRole("button", { name: "This event only" }));

    expect(openSheet()).toHaveTextContent("");
    await waitFor(async () =>
      expect(await store.db.events.get(WEEKLY.id)).toMatchObject({ ...WEEKLY, exdates: [WEEK_2] }),
    );
    expect((await store.db.events.get(WEEKLY.id))?.deletedAt).toBeUndefined();
    expect(await store.db.outbox.count()).toBe(1);
  });

  test("EVT-14 deleting All events in the series removes every week", async () => {
    await editWeek();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(
      within(seriesDialog()).getByRole("button", { name: "All events in the series" }),
    );

    await waitFor(async () =>
      expect((await store.db.events.get(WEEKLY.id))?.deletedAt).toBeDefined(),
    );
  });

  test("EVT-14 Keep event and the scrim close the dialog and keep the page", async () => {
    await editWeek();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(within(seriesDialog()).getByRole("button", { name: "Keep event" }));

    noSeriesDialog();

    await typeTitle("!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByTestId("dialog-scrim"));

    noSeriesDialog();
    expect(screen.getByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
    expect((await store.db.events.get(WEEKLY.id))?.title).toBe(WEEKLY.title);
  });

  test("EVT-14 saving This event only leaves the series and adds a one-time event on that date", async () => {
    await editWeek();

    await typeTitle("!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(seriesDialog()).toHaveTextContent(
      "Lunch with Aunt Rosa repeats every Friday. Apply your changes to Fri, Oct 16 only, or to every event in the series.",
    );

    await userEvent.click(within(seriesDialog()).getByRole("button", { name: "This event only" }));

    expect(openSheet()).toHaveTextContent("");
    await waitFor(async () => expect(await store.db.outbox.count()).toBe(2));
    expect(await store.db.events.get(WEEKLY.id)).toMatchObject({ ...WEEKLY, exdates: [WEEK_2] });

    const [detached] = (await store.db.events.toArray()).filter((e) => e.id !== WEEKLY.id);

    expect(detached).toMatchObject({
      title: "Lunch with Aunt Rosa!",
      startAt: new Date(2026, 9, 16, 12, 0).toISOString(),
      endAt: new Date(2026, 9, 16, 13, 0).toISOString(),
    });
    expect(detached).not.toHaveProperty("repeat");
    expect(detached).not.toHaveProperty("exdates");
  });

  test("EVT-14 saving All events in the series changes every week from its first day", async () => {
    await editWeek();

    await typeTitle("!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(
      within(seriesDialog()).getByRole("button", { name: "All events in the series" }),
    );

    await waitFor(async () =>
      expect(await store.db.events.get(WEEKLY.id)).toMatchObject({
        ...WEEKLY,
        title: "Lunch with Aunt Rosa!",
      }),
    );
    expect(await store.db.events.count()).toBe(1);
  });

  test("EVT-14 Save with no changes on a weekly event saves without asking and keeps its first day", async () => {
    await editWeek();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    noSeriesDialog();
    expect(openSheet()).toHaveTextContent("");
    await waitFor(async () => expect(await store.db.outbox.count()).toBe(1));
    expect((await store.db.events.get(WEEKLY.id))?.startAt).toBe(WEEKLY.startAt);
  });

  test("EVT-14 the dialog doesn't open for a one-time event", async () => {
    await store.db.events.put(synced(LUNCH));
    renderSheet({ kind: "event", id: LUNCH.id, edit: true });

    await typeTitle("!");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    noSeriesDialog();
    expect(screen.getByRole("button", { name: "Delete event" })).toBeInTheDocument();
  });
});
