import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { CalendarEvent, Tag, Weather } from "@/domain/schemas";
import { zonedInstant } from "@/domain/zone";
import { DayTimeline, type DayTimelineLabels } from "./DayTimeline";

const tz = "America/Los_Angeles";

const october = (day: number, minutes: number) =>
  zonedInstant(tz, { year: 2026, month: 10, day }, minutes);

const NOW = october(9, 10 * 60 + 41);

const MOM: Tag = {
  id: "0195f0a0-0000-7000-8000-000000000501",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const DAD: Tag = { ...MOM, id: "0195f0a0-0000-7000-8000-000000000502", name: "Dad" };

const plan = (
  n: number,
  title: string,
  [day, start, end]: [number, number, number?],
): CalendarEvent => ({
  id: `0195f0a0-0000-7000-8000-00000000000${n}`,
  title,
  startAt: october(day, start).toISOString(),
  ...(end !== undefined && { endAt: october(day, end).toISOString() }),
  everyone: false,
  tagIds: [MOM.id],
  notify: true,
});

const hourly = (day: number, rows: [hour: number, temp: number, precip: number][]) =>
  rows.map(([hour, temp, precip]) => ({
    time: october(day, hour * 60).toISOString(),
    icon: precip >= 50 ? ("cloud-rain" as const) : ("cloud" as const),
    temp,
    precip,
  })) as Weather["hourly"];

const labels: DayTimelineLabels = {
  everyone: "Everyone",
  rain: (percent) => `${percent}% rain`,
  until: (time) => `Until ${time}`,
  free: (everyone, length) => `${everyone ? "Everyone free" : "Free"} · ${length}`,
  freeName: (range) => `Free ${range}. Add event`,
  planName: (title, range) => `${title}, ${range}`,
  more: "More",
  moreName: (count, range, opensCalendar) =>
    `${count} more ${count === 1 ? "plan" : "plans"}, ${range}. ${opensCalendar ? "Open calendar" : "Show details"}`,
  longPlans: "Long plans",
  icons: {
    sun: "Clear",
    moon: "Clear",
    "cloud-sun": "Partly cloudy",
    "cloud-moon": "Partly cloudy",
    cloud: "Cloudy",
    cloudy: "Overcast",
    "cloud-fog": "Fog",
    "cloud-drizzle": "Drizzle",
    "cloud-rain": "Rain",
    "cloud-snow": "Snow",
    snowflake: "Snow grains",
    "cloud-lightning": "Thunderstorm",
  },
};

type Props = ComponentProps<typeof DayTimeline>;

const base: Props = {
  plans: [],
  tags: [MOM, DAD],
  day: "2026-10-10",
  now: NOW,
  tz,
  clock: "12h",
  variant: "calendar",
  breakpoint: "large",
  free: "everyone",
  labels,
  onOpenEvent: () => {},
  onOpenMore: () => {},
  onAddEvent: () => {},
};

const SOCCER = plan(1, "Soccer game", [10, 540, 630]);

const VIDEO_CALL = plan(2, "Grandma’s video call", [9, 600, 720]);

test("TL-04 a plan is a button named by its title and range", () => {
  render(<DayTimeline {...base} plans={[SOCCER]} />);

  expect(screen.getByRole("button", { name: "Soccer game, 9:00 – 10:30 AM" })).toBeVisible();
});

test("TL-10 tapping a plan opens it", async () => {
  const onOpenEvent = vi.fn();
  render(<DayTimeline {...base} plans={[SOCCER]} onOpenEvent={onOpenEvent} />);

  await userEvent.click(screen.getByRole("button", { name: /^Soccer game/ }));

  expect(onOpenEvent).toHaveBeenCalledWith(SOCCER.id);
});

test("TL-04 a plan that started before 5 AM reads Until its end", () => {
  render(<DayTimeline {...base} plans={[plan(3, "Pick up bait", [10, 270, 315])]} />);

  expect(screen.getByRole("button", { name: /^Pick up bait/ })).toHaveTextContent("Until 5:15");
});

test("TL-08 an empty day shows one free slot for everyone", () => {
  render(<DayTimeline {...base} />);

  const slot = screen.getByRole("button", { name: "Free 5:00 AM – 9:00 PM. Add event" });

  expect(slot).toHaveTextContent("Everyone free · 16 h");
});

test("TL-08 a filtered day says Free", () => {
  render(<DayTimeline {...base} free="some" plans={[SOCCER]} />);

  expect(
    screen.getByRole("button", { name: "Free 10:30 AM – 9:00 PM. Add event" }),
  ).toHaveTextContent("Free · 10 h 30 min");
});

test("TL-08 nobody selected shows no free slots", () => {
  render(<DayTimeline {...base} free="none" />);

  expect(screen.queryByRole("button", { name: /^Free/ })).not.toBeInTheDocument();
});

test("TL-08 tapping a free slot adds an event at its start rounded up to 15 min, 1 hour long", async () => {
  const onAddEvent = vi.fn();
  render(<DayTimeline {...base} day="2026-10-09" onAddEvent={onAddEvent} />);

  await userEvent.click(screen.getByRole("button", { name: /^Free 10:41/ }));

  expect(onAddEvent).toHaveBeenCalledWith({
    start: october(9, 10 * 60 + 45),
    end: october(9, 11 * 60 + 45),
  });
});

test("TL-05 the plan happening now has no NOW pill", () => {
  render(<DayTimeline {...base} day="2026-10-09" plans={[VIDEO_CALL]} />);

  expect(screen.getByRole("button", { name: /^Grandma/ })).not.toHaveTextContent("Now");
});

test("TL-12 the +N MORE tile on Calendar opens the earliest folded plan", async () => {
  const onOpenMore = vi.fn();
  const plans = [
    plan(4, "Swim", [10, 540, 600]),
    plan(5, "Piano", [10, 540, 600]),
    plan(6, "Chess", [10, 550, 600]),
    plan(7, "Art", [10, 545, 600]),
  ];
  render(<DayTimeline {...base} plans={plans} onOpenMore={onOpenMore} />);

  const more = screen.getByRole("button", {
    name: "2 more plans, 9:05 – 10:00 AM. Show details",
  });
  await userEvent.click(more);

  expect(more).toHaveTextContent("+2");
  expect(screen.queryByRole("button", { name: /^Chess/ })).not.toBeInTheDocument();
  expect(onOpenMore).toHaveBeenCalledWith(plans[3]?.id);
});

test("TL-12 on Today the +N MORE tile says it opens the calendar", () => {
  const plans = [4, 5, 6, 7, 8, 9].map((n) => plan(n, `Plan ${n}`, [10, 540, 600]));
  render(<DayTimeline {...base} variant="today" plans={plans} />);

  expect(screen.getByRole("button", { name: /more plans, .*\. Open calendar$/ })).toBeVisible();
});

test("TL-13 a plan over 3 hours is a strip button that opens it", async () => {
  const onOpenEvent = vi.fn();
  const school = plan(4, "School", [10, 495, 900]);
  render(<DayTimeline {...base} plans={[school, SOCCER]} onOpenEvent={onOpenEvent} />);

  const strips = screen.getByRole("group", { name: "Long plans" });
  await userEvent.click(within(strips).getByRole("button", { name: /^School/ }));

  expect(within(strips).getByRole("button", { name: /^School/ })).toHaveTextContent("8:15");
  expect(onOpenEvent).toHaveBeenCalledWith(school.id);
});

test("TL-09 today shows the now time in the gutter and other days don't", () => {
  const { rerender } = render(<DayTimeline {...base} day="2026-10-09" />);

  expect(screen.getByText("10:41")).toBeVisible();

  rerender(<DayTimeline {...base} />);

  expect(screen.queryByText("10:41")).not.toBeInTheDocument();
});

test("TL-07 Calendar shows each hour's weather in the gutter, no lane, and plans in rain get a chip", () => {
  const weather = {
    hourly: hourly(10, [
      [9, 52, 70],
      [10, 54, 80],
      [11, 56, 10],
    ]),
    unit: "F",
  } as const;
  render(<DayTimeline {...base} plans={[SOCCER]} weather={weather} />);

  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  expect(screen.getByText("54°")).toBeVisible();
  expect(screen.getAllByRole("img", { name: "Rain" })).toHaveLength(2);
  expect(screen.getByRole("button", { name: /^Soccer game/ })).toHaveTextContent("80% rain");
});

test("TL-07 on small Calendar keeps the gutter weather and drops the rain chips", () => {
  const weather = { hourly: hourly(10, [[9, 52, 70]]), unit: "F" } as const;
  render(<DayTimeline {...base} breakpoint="small" plans={[SOCCER]} weather={weather} />);

  expect(screen.getByText("52°")).toBeVisible();
  expect(screen.getByRole("button", { name: /^Soccer game/ })).not.toHaveTextContent("rain");
});

test("TL-07 Today shows hour weather only where it says something new", () => {
  const weather = {
    hourly: hourly(9, [
      [12, 66, 10],
      [13, 67, 20],
    ]),
    unit: "F",
  } as const;
  render(<DayTimeline {...base} variant="today" day="2026-10-09" weather={weather} />);

  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  expect(screen.getByText("66°")).toBeVisible();
  expect(screen.getAllByRole("img", { name: "Cloudy" })[0]).toBeVisible();
  expect(screen.queryByText("67°")).not.toBeInTheDocument();
});
