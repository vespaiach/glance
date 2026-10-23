import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { FixtureParams } from "@/data/repos";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  synced,
} from "@/data/repos/testHarness";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { EventSheetScreen } from "@/features/events";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { SheetHost, useSheetHost } from "@/shell/SheetHost";
import { CalendarScreen } from "./CalendarScreen";

let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/calendar",
  useRouter: () => ({ push: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(search),
}));

const NOW = new Date(2026, 9, 9, 10, 41);

const at = (month: number, day: number, h: number, m = 0) =>
  new Date(2026, month, day, h, m).toISOString();

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `0192f1a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = tag(1, "Minh-An", "lilac");

const MOM = tag(2, "Mom", "coral");

const DAD = tag(3, "Dad", "sky");

const FAMILY = [AN, MOM, DAD];

function event(
  n: number,
  title: string,
  startAt: string,
  who: Tag[] | "everyone" = "everyone",
  extra: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
    title,
    startAt,
    endAt: new Date(new Date(startAt).getTime() + 3_600_000).toISOString(),
    everyone: who === "everyone",
    tagIds: who === "everyone" ? [] : who.map((one) => one.id),
    ...extra,
  };
}

const CALL = event(1, "Grandma’s video call", at(9, 9, 13), [MOM]);

const SOCCER = event(2, "Soccer", at(9, 9, 16), [AN]);

const DINNER = event(3, "Family dinner", at(9, 9, 18));

const DENTIST = event(4, "Dentist", at(9, 7, 16), [DAD]);

const LATE_SHOW = event(5, "Late show", at(9, 9, 22), [DAD]);

const PICNIC_DAY = event(6, "Field trip", "2026-10-09T00:00:00.000Z", [AN], { allDay: true });

const NEXT_YEAR = event(7, "New Year brunch", at(12, 1, 11));

const NOBODY_PLAN = event(8, "Water the plants", at(9, 9, 11), []);

let store: Harness;

beforeEach(() => {
  search = "";

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
  vi.restoreAllMocks();

  await store.close();
});

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

function renderCalendar(params: FixtureParams = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW, who: params.who });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <FixtureParamsProvider params={params}>
        <SheetHost>{children}</SheetHost>
      </FixtureParamsProvider>
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

async function seed(...events: CalendarEvent[]) {
  await markSynced(store);
  await store.db.tags.bulkPut(FAMILY.map((one) => synced(one)));
  await store.db.events.bulkPut(events.map((one) => synced(one)));
}

const openSheet = () => screen.getByRole("status", { name: "Open sheet" });

const plan = (title: string) => screen.queryByRole("button", { name: new RegExp(`^${title}, `) });

const day = (name: string) => screen.getByRole("button", { name });

const whoStack = (label: string) =>
  screen.findByRole("button", { name: `Show plans for: ${label}. Change` });

const whoRow = (name: string) =>
  within(screen.getByRole("dialog", { name: "Show plans for" })).getByRole("checkbox", { name });

async function openWho() {
  await userEvent.click(await screen.findByRole("button", { name: /^Show plans for: / }));
}

async function toggleWho(...names: string[]) {
  await openWho();
  const sheet = within(screen.getByRole("dialog", { name: "Show plans for" }));
  for (const name of names) await userEvent.click(await sheet.findByRole("checkbox", { name }));
  await userEvent.click(screen.getByRole("button", { name: "Done" }));
}

test("CAL-01 the week strip runs Sunday to Saturday with today selected and ringed", async () => {
  await seed(CALL);

  renderCalendar();

  expect(await screen.findByText("Oct 4 – 10")).toBeInTheDocument();
  expect(screen.getByText("October")).toBeInTheDocument();
  const week = within(screen.getByRole("group", { name: "Week of October 4" }));
  expect(week.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
    "Sunday, October 4",
    "Monday, October 5",
    "Tuesday, October 6",
    "Wednesday, October 7",
    "Thursday, October 8",
    "Friday, October 9",
    "Saturday, October 10",
  ]);
  const today = day("Friday, October 9");
  expect(today).toHaveAttribute("aria-pressed", "true");
  expect(today).toHaveAttribute("aria-current", "date");
  expect(await screen.findByRole("button", { name: /^Grandma’s video call, / })).toBeVisible();
});

test("CAL-01 tapping a day shows its plans and today keeps its ring", async () => {
  await seed(CALL, DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Wednesday, October 7" }));

  expect(await screen.findByRole("button", { name: /^Dentist, / })).toBeInTheDocument();
  expect(plan("Grandma’s video call")).not.toBeInTheDocument();
  expect(day("Wednesday, October 7")).toHaveAttribute("aria-pressed", "true");
  const today = day("Friday, October 9");
  expect(today).toHaveAttribute("aria-pressed", "false");
  expect(today).toHaveAttribute("aria-current", "date");
});

test("CAL-01 the week strip counts every plan on a day, whatever the filter", async () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
  await seed(CALL, SOCCER, DINNER, DENTIST);

  renderCalendar();

  await toggleWho("Mom");

  expect(await within(day("Friday, October 9")).findByText("3 events")).toBeInTheDocument();
  expect(within(day("Wednesday, October 7")).getByText("1 event")).toBeInTheDocument();
  expect(within(day("Thursday, October 8")).queryByText(/event/)).not.toBeInTheDocument();
});

test("CAL-02 the Today button shows only with another day selected and selects today", async () => {
  await seed();

  renderCalendar();

  await screen.findByRole("button", { name: "Wednesday, October 7" });
  expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();

  await userEvent.click(day("Wednesday, October 7"));
  await userEvent.click(screen.getByRole("button", { name: "Today" }));

  expect(day("Friday, October 9")).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
});

test("CAL-02 the next chevron steps a week and selects its Sunday", async () => {
  await seed(DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Next week" }));

  expect(screen.getByText("October")).toBeInTheDocument();
  expect(day("Sunday, October 11")).toHaveAttribute("aria-pressed", "true");
  expect(day("Friday, October 16")).not.toHaveAttribute("aria-current");
});

test("CAL-02 stepping back onto this week selects today", async () => {
  await seed();

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Previous week" }));

  expect(screen.getByText("October")).toBeInTheDocument();
  expect(day("Sunday, September 27")).toHaveAttribute("aria-pressed", "true");

  await userEvent.click(screen.getByRole("button", { name: "Next week" }));

  expect(day("Friday, October 9")).toHaveAttribute("aria-pressed", "true");
});

test("CAL-04 ?date= selects that day, in another year too", async () => {
  search = "date=2027-01-01";
  await seed(NEXT_YEAR);

  renderCalendar();

  expect(await screen.findByText("Dec 27 – Jan 2, 2027")).toBeInTheDocument();
  expect(screen.getByText("January")).toBeInTheDocument();
  expect(day("Friday, January 1")).toHaveAttribute("aria-pressed", "true");
  expect(await screen.findByRole("button", { name: /^New Year brunch, / })).toBeInTheDocument();
});

test("CAL-04 an invalid ?date= selects today", async () => {
  search = "date=2026-02-30";
  await seed();

  renderCalendar();

  expect(await screen.findByRole("button", { name: "Friday, October 9" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("CAL-05 every tag is selected by default and every plan shows", async () => {
  await seed(CALL, SOCCER, DINNER, NOBODY_PLAN);

  renderCalendar();

  expect(await screen.findByRole("button", { name: /^Soccer, / })).toBeInTheDocument();
  expect(plan("Grandma’s video call")).toBeInTheDocument();
  expect(plan("Family dinner")).toBeInTheDocument();
  expect(plan("Water the plants")).toBeInTheDocument();

  await openWho();

  expect(whoRow("Everyone")).toHaveAttribute("aria-checked", "true");
  for (const one of FAMILY) expect(whoRow(one.name)).toHaveAttribute("aria-checked", "true");
});

test("CAL-05 turning a tag off hides their plans, everyone plans stay, and the stack names the rest", async () => {
  await seed(CALL, SOCCER, DINNER);

  renderCalendar();

  await screen.findByRole("button", { name: /^Soccer, / });
  await openWho();
  await userEvent.click(whoRow("Minh-An"));

  expect(whoRow("Minh-An")).toHaveAttribute("aria-checked", "false");
  expect(plan("Soccer")).not.toBeInTheDocument();
  expect(plan("Grandma’s video call")).toBeInTheDocument();
  expect(plan("Family dinner")).toBeInTheDocument();

  await userEvent.keyboard("{Escape}");

  expect(await whoStack("Mom, Dad")).toHaveFocus();

  await toggleWho("Minh-An");

  expect(plan("Soccer")).toBeInTheDocument();
});

test("CAL-05 nobody plans show only while every tag is selected", async () => {
  await seed(NOBODY_PLAN);

  renderCalendar();

  expect(await screen.findByRole("button", { name: /^Water the plants, / })).toBeInTheDocument();

  await toggleWho("Dad");

  expect(plan("Water the plants")).not.toBeInTheDocument();
});

test("CAL-05 turning every tag off shows no plans, tiles or free slots", async () => {
  await seed(CALL, DINNER, PICNIC_DAY);

  renderCalendar();

  await screen.findByRole("button", { name: /^Family dinner, / });
  await toggleWho("Everyone");

  expect(await whoStack("No one")).toBeInTheDocument();
  expect(plan("Grandma’s video call")).not.toBeInTheDocument();
  expect(plan("Family dinner")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Field trip/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Free / })).not.toBeInTheDocument();
});

test("CAL-05 the chip row is gone: the filter is one stack button", async () => {
  await seed(CALL);

  renderCalendar();

  await screen.findByRole("button", { name: /^Grandma’s video call, / });

  expect(screen.queryByRole("group", { name: "Show plans for" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Mom" })).not.toBeInTheDocument();
});

test("FAM-07 the filter has no Edit button", async () => {
  await seed(CALL);

  renderCalendar();

  await screen.findByRole("button", { name: /^Grandma’s video call, / });
  await openWho();

  expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
});

test("FAM-05 a new tag joins a filter that shows everyone, selected", async () => {
  await seed(CALL);

  renderCalendar();

  await screen.findByRole("button", { name: /^Grandma’s video call, / });
  await store.db.tags.put(synced(tag(4, "Tin", "mint")));
  await openWho();

  expect(await screen.findByRole("checkbox", { name: "Tin" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("FAM-05 a new tag stays off when some tags are off", async () => {
  await seed(CALL);

  renderCalendar();

  await screen.findByRole("button", { name: /^Grandma’s video call, / });
  await toggleWho("Dad");
  await store.db.tags.put(synced(tag(4, "Tin", "mint")));
  await openWho();

  expect(await screen.findByRole("checkbox", { name: "Tin" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("CAL-05 who= starts the filter and whosheet=1 opens the list", async () => {
  await seed(CALL, SOCCER);

  renderCalendar({ who: [MOM.id], whosheet: true });

  expect(await screen.findByRole("dialog", { name: "Show plans for" })).toBeInTheDocument();
  expect(await screen.findByRole("checkbox", { name: "Mom" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(whoRow("Minh-An")).toHaveAttribute("aria-checked", "false");
  expect(plan("Soccer")).not.toBeInTheDocument();
});

test("CAL-06 the 24 hours link counts the plans outside 5 AM to 9 PM and shows them when on", async () => {
  await seed(CALL, LATE_SHOW);

  renderCalendar();

  const link = await screen.findByRole("button", { name: "Show all 24 hours · 1 more plan" });

  expect(link).toHaveAttribute("aria-pressed", "false");

  await userEvent.click(link);

  const on = screen.getByRole("button", { name: "Show 5 AM – 9 PM only" });
  expect(on).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByText("12 AM")[0]).toBeInTheDocument();
});

test("CAL-06 the filter row has no 24 hours pill and 24 hours stays on across days", async () => {
  await seed(CALL, DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Show all 24 hours" }));
  await userEvent.click(day("Wednesday, October 7"));

  expect(screen.getByRole("button", { name: "Show 5 AM – 9 PM only" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByRole("button", { name: /^24 hours/ })).not.toBeInTheDocument();
});

test("CAL-07 Add event opens New event on the selected day for everyone", async () => {
  await seed();

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Wednesday, October 7" }));
  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(openSheet()).toHaveTextContent(
    JSON.stringify({ kind: "newevent", day: "2026-10-07", who: { everyone: true, tagIds: [] } }),
  );
});

test("CAL-07 Add event starts with the selected tags in tag order", async () => {
  await seed();

  renderCalendar();

  await toggleWho("Mom");
  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(openSheet()).toHaveTextContent(
    JSON.stringify({
      kind: "newevent",
      day: "2026-10-09",
      who: { everyone: false, tagIds: [AN.id, DAD.id] },
    }),
  );
});

test("CAL-07 Add event with every tag off starts for nobody", async () => {
  await seed();

  renderCalendar();

  await toggleWho("Everyone");
  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(openSheet()).toHaveTextContent(
    JSON.stringify({ kind: "newevent", day: "2026-10-09", who: { everyone: false, tagIds: [] } }),
  );
});

test("CAL-08 an empty day shows one free slot for everyone", async () => {
  await seed(DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Sunday, October 4" }));

  expect(await screen.findAllByRole("button", { name: /^Free / })).toHaveLength(1);
  expect(screen.getByText("Everyone free · 16 h")).toBeInTheDocument();
});

test("CAL-08 a filtered empty day says Free", async () => {
  await seed(DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Sunday, October 4" }));
  await screen.findByText("Everyone free · 16 h");
  await toggleWho("Mom");

  expect(await screen.findByText("Free · 16 h")).toBeInTheDocument();
});

test("CAL-08 with no events at all the empty calendar tile replaces the timeline", async () => {
  await seed();

  renderCalendar();

  expect(await screen.findByText("The calendar is empty")).toBeInTheDocument();
  expect(
    screen.getByText("Select a day, then add an event. Days with plans get a dot for each person."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Free / })).not.toBeInTheDocument();
});

test("CAL-09 all-day tiles show above the timeline and follow the filter", async () => {
  await seed(PICNIC_DAY, CALL);

  renderCalendar();

  expect(await screen.findByRole("button", { name: /Field trip/ })).toBeInTheDocument();

  await toggleWho("Minh-An");

  expect(screen.queryByRole("button", { name: /Field trip/ })).not.toBeInTheDocument();
});

test("TL-10 tapping a plan opens Event details", async () => {
  await seed(CALL);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: /^Grandma’s video call, / }));

  expect(openSheet()).toHaveTextContent(JSON.stringify({ kind: "event", id: CALL.id }));
});

test("TL-08 tapping a free slot opens New event at the slot", async () => {
  await seed(DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Sunday, October 4" }));
  await userEvent.click(await screen.findByRole("button", { name: /^Free / }));

  expect(JSON.parse(openSheet().textContent ?? "")).toMatchObject({
    kind: "newevent",
    day: "2026-10-04",
    times: { start: 300, end: 360 },
  });
});

test("EVT-07 an event added on the Calendar shows on its day", async () => {
  await seed(CALL);

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
  await userEvent.type(await screen.findByLabelText("Title"), "Picnic");
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Save event" }),
  );

  expect(await screen.findByRole("button", { name: /^Picnic, / })).toBeInTheDocument();
});

test("FAIL-01 a failed first sync shows Calendar unavailable with a countdown and Try again", async () => {
  await putSyncStatus(store, {
    online: true,
    error: "server",
    retryAt: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    weather: { state: "idle" },
  });

  renderCalendar();

  expect(await screen.findByText("Calendar unavailable")).toBeInTheDocument();
  expect(
    screen.getByText("The Glance server isn’t responding. Trying again in 5 min."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(store.nudge).toHaveBeenCalledTimes(1);
});

function onSmall() {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const picker = () => screen.queryByRole("dialog", { name: "Pick a date" });

test("CAL-02 on small the date control replaces the week strip and opens the picker", async () => {
  onSmall();
  await seed(CALL);

  renderCalendar();

  const control = await screen.findByRole("button", { name: "Friday, October 9. Pick a date" });
  expect(screen.queryByRole("group", { name: "Week of October 4" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next week" })).not.toBeInTheDocument();
  expect(picker()).not.toBeInTheDocument();

  await userEvent.click(control);

  expect(picker()).toBeInTheDocument();
  expect(within(picker() as HTMLElement).getByText("October 2026")).toBeInTheDocument();
});

test("CAL-03 picking a day selects it, closes the picker and shows its plans", async () => {
  onSmall();
  await seed(CALL, DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: /Pick a date$/ }));
  await userEvent.click(screen.getByRole("button", { name: "Wednesday, October 7" }));

  expect(picker()).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Wednesday, October 7. Pick a date" }),
  ).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /^Dentist, / })).toBeInTheDocument();
});

test("CAL-03 picker days with plans carry a dot", async () => {
  onSmall();
  await seed(CALL, SOCCER, DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: /Pick a date$/ }));

  const marked = (name: string) =>
    within(picker() as HTMLElement)
      .getByRole("button", { name })
      .querySelector("[data-marked]");
  await waitFor(() => expect(marked("Friday, October 9")).not.toBeNull());
  expect(marked("Wednesday, October 7")).not.toBeNull();
  expect(marked("Thursday, October 8")).toBeNull();
});

test("CAL-03 Today selects today and closes; Close keeps the day", async () => {
  onSmall();
  search = "date=2026-11-20";
  await seed();

  renderCalendar();

  await userEvent.click(
    await screen.findByRole("button", { name: "Friday, November 20. Pick a date" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(picker()).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Friday, November 20\./ })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Pick a date$/ }));
  await userEvent.click(screen.getByRole("button", { name: "Today" }));

  expect(picker()).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Friday, October 9. Pick a date" }),
  ).toBeInTheDocument();
});
