import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  synced,
} from "@/data/repos/testHarness";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { EventSheetScreen } from "@/features/events";
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

async function seed(...events: CalendarEvent[]) {
  await markSynced(store);
  await store.db.tags.bulkPut(FAMILY.map((one) => synced(one)));
  await store.db.events.bulkPut(events.map((one) => synced(one)));
}

const openSheet = () => screen.getByRole("status", { name: "Open sheet" });

const plan = (title: string) => screen.queryByRole("button", { name: new RegExp(`^${title}, `) });

const day = (name: string) => screen.getByRole("button", { name });

const pill = (name: string) =>
  within(screen.getByRole("group", { name: "Show plans for" })).getByRole("button", { name });

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

test("CAL-02 the next chevron steps a week and selects its Sunday", async () => {
  await seed(DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Next week" }));

  expect(screen.getByText("Oct 11 – 17")).toBeInTheDocument();
  expect(day("Sunday, October 11")).toHaveAttribute("aria-pressed", "true");
  expect(day("Friday, October 16")).not.toHaveAttribute("aria-current");
});

test("CAL-02 stepping back onto this week selects today", async () => {
  await seed();

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Previous week" }));

  expect(screen.getByText("Sep 27 – Oct 3")).toBeInTheDocument();
  expect(day("Sunday, September 27")).toHaveAttribute("aria-pressed", "true");

  await userEvent.click(screen.getByRole("button", { name: "Next week" }));

  expect(day("Friday, October 9")).toHaveAttribute("aria-pressed", "true");
});

test("CAL-04 ?date= selects that day, in another year too", async () => {
  search = "date=2027-01-01";
  await seed(NEXT_YEAR);

  renderCalendar();

  expect(await screen.findByText("January 2027")).toBeInTheDocument();
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
  for (const one of FAMILY) expect(pill(one.name)).toHaveAttribute("aria-pressed", "true");
});

test("CAL-05 tapping a tag turns it off: their plans hide, everyone plans stay", async () => {
  await seed(CALL, SOCCER, DINNER);

  renderCalendar();

  await screen.findByRole("button", { name: /^Soccer, / });
  await userEvent.click(pill("Minh-An"));

  expect(pill("Minh-An")).toHaveAttribute("aria-pressed", "false");
  expect(plan("Soccer")).not.toBeInTheDocument();
  expect(plan("Grandma’s video call")).toBeInTheDocument();
  expect(plan("Family dinner")).toBeInTheDocument();

  await userEvent.click(pill("Minh-An"));

  expect(plan("Soccer")).toBeInTheDocument();
});

test("CAL-05 nobody plans show only while every tag is selected", async () => {
  await seed(NOBODY_PLAN);

  renderCalendar();

  expect(await screen.findByRole("button", { name: /^Water the plants, / })).toBeInTheDocument();

  await userEvent.click(pill("Dad"));

  expect(plan("Water the plants")).not.toBeInTheDocument();
});

test("CAL-05 turning every tag off shows no plans, tiles or free slots", async () => {
  await seed(CALL, DINNER, PICNIC_DAY);

  renderCalendar();

  await screen.findByRole("button", { name: /^Family dinner, / });
  for (const one of FAMILY) await userEvent.click(pill(one.name));

  expect(pill("Mom")).toHaveAttribute("aria-pressed", "false");
  expect(plan("Grandma’s video call")).not.toBeInTheDocument();
  expect(plan("Family dinner")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Field trip/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Free / })).not.toBeInTheDocument();
});

test("FAM-07 the filter row has no Edit button", async () => {
  await seed(CALL);

  renderCalendar();

  await screen.findByRole("button", { name: /^Grandma’s video call, / });

  expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
});

test("FAM-05 a new tag joins a filter that shows everyone, selected", async () => {
  await seed(CALL);

  renderCalendar();

  await screen.findByRole("button", { name: /^Grandma’s video call, / });
  await store.db.tags.put(synced(tag(4, "Tin", "mint")));

  expect(await screen.findByRole("button", { name: "Tin" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("FAM-05 a new tag stays off when some tags are off", async () => {
  await seed(CALL);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "Dad" }));
  await store.db.tags.put(synced(tag(4, "Tin", "mint")));

  expect(await screen.findByRole("button", { name: "Tin" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("CAL-06 24 hours counts the plans outside 5 AM to 9 PM and shows them when on", async () => {
  await seed(CALL, LATE_SHOW);

  renderCalendar();

  const span = await screen.findByRole("button", { name: "24 hours, 1 more plan" });

  expect(span).toHaveAttribute("aria-pressed", "false");
  expect(within(span).getByText("1")).toBeInTheDocument();

  await userEvent.click(span);

  const on = screen.getByRole("button", { name: "24 hours" });
  expect(on).toHaveAttribute("aria-pressed", "true");
  expect(within(on).queryByText("1")).not.toBeInTheDocument();
  expect(screen.getAllByText("12 AM")[0]).toBeInTheDocument();
});

test("CAL-06 the badge hides at 0 and 24 hours stays on across days", async () => {
  await seed(CALL, DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: "24 hours" }));
  await userEvent.click(day("Wednesday, October 7"));

  expect(screen.getByRole("button", { name: "24 hours" })).toHaveAttribute("aria-pressed", "true");
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

  await userEvent.click(await screen.findByRole("button", { name: "Mom" }));
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

  for (const one of FAMILY)
    await userEvent.click(await screen.findByRole("button", { name: one.name }));
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
  await userEvent.click(pill("Mom"));

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

  await userEvent.click(pill("Minh-An"));

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
    within(screen.getByRole("dialog")).getByRole("button", { name: "Add event" }),
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

function onPhone() {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const picker = () => screen.queryByRole("dialog", { name: "Pick a date" });

test("CAL-02 on a phone the date control replaces the week strip and opens the picker", async () => {
  onPhone();
  await seed(CALL);

  renderCalendar();

  const control = await screen.findByRole("button", { name: "Friday, October 9. Pick a date" });
  expect(screen.queryByRole("group", { name: "Week of October 4" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next week" })).not.toBeInTheDocument();
  expect(picker()).not.toBeInTheDocument();

  await userEvent.click(control);

  expect(picker()).toBeInTheDocument();
  expect(within(picker() as HTMLElement).getByText("August 2026")).toBeInTheDocument();
  expect(within(picker() as HTMLElement).getByText("January 2027")).toBeInTheDocument();
});

test("CAL-03 picking a day selects it, closes the picker and shows its plans", async () => {
  onPhone();
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

test("CAL-03 picker days carry a dot per tag with a plan", async () => {
  onPhone();
  await seed(CALL, SOCCER, DENTIST);

  renderCalendar();

  await userEvent.click(await screen.findByRole("button", { name: /Pick a date$/ }));

  const today = within(picker() as HTMLElement).getByRole("button", { name: "Friday, October 9" });
  await waitFor(() => expect(today.querySelectorAll("[aria-hidden='true']")).toHaveLength(2));
});

test("CAL-03 Today selects today and closes; Close keeps the day", async () => {
  onPhone();
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
