import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { DEFAULT_AMBIENT } from "@/domain/schemas";
import { AmbientScheduleView } from "./AmbientScheduleView";

type Props = ComponentProps<typeof AmbientScheduleView>;

const SPLIT = { ...DEFAULT_AMBIENT, mode: "split" } as const;

function renderView(overrides: Partial<Props> = {}) {
  const props: Props = {
    ambient: DEFAULT_AMBIENT,
    clock: "12h",
    idleTimeout: { on: true, minutes: 3 },
    breakpoint: "large",
    onChange: vi.fn(),
    onBack: vi.fn(),
    onPreview: vi.fn(),
    ...overrides,
  };

  render(<AmbientScheduleView {...props} />);

  return props;
}

function selectedMode() {
  const tabs = within(screen.getByRole("group", { name: "Schedule" })).getAllByRole("button");

  return tabs.find((tab) => tab.getAttribute("aria-pressed") === "true")?.textContent;
}

const field = (name: RegExp, scope: HTMLElement = document.body) =>
  within(scope).getByRole("button", { name });

const set = (name: string) => screen.getByRole("group", { name });

test("SET-10 Every night is the default with Dims at, Wakes at and the length past midnight", () => {
  renderView();

  expect(screen.getByRole("heading", { name: "Ambient screen" })).toBeInTheDocument();
  expect(selectedMode()).toBe("Every night");
  expect(field(/^Dims at, 6:00 PM/)).toHaveAttribute("aria-expanded", "false");
  expect(field(/^Wakes at, 7:30 AM/)).toBeInTheDocument();
  expect(screen.getByText("13 hr 30 min")).toBeInTheDocument();
});

test("SET-10 Weekends differ shows the Sun – Thu and Fri & Sat sets", () => {
  renderView({ ambient: SPLIT });

  expect(selectedMode()).toBe("Weekends differ");
  expect(field(/^Dims at, 6:00 PM/, set("Sun – Thu nights"))).toBeInTheDocument();
  expect(field(/^Dims at, 9:00 PM/, set("Fri & Sat nights"))).toBeInTheDocument();
  expect(field(/^Wakes at, 9:00 AM/, set("Fri & Sat nights"))).toBeInTheDocument();
  expect(screen.getByText("12 hr")).toBeInTheDocument();
});

test("SET-10 switching modes keeps both sets of times", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: "Weekends differ" }));

  expect(props.onChange).toHaveBeenCalledWith({ ...DEFAULT_AMBIENT, mode: "split" });
});

test("SET-10 tapping a field opens its picker with 15-minute steps, and tapping it again closes it", async () => {
  renderView();

  await userEvent.click(field(/^Dims at/));

  const picker = screen.getByRole("group", { name: "Dim time" });

  expect(within(picker).getByText("Dims at · 6:00 PM")).toBeInTheDocument();
  expect(
    within(within(picker).getByRole("group", { name: "Minutes" })).getAllByRole("button"),
  ).toHaveLength(4);
  expect(field(/^Dims at/)).toHaveAttribute("aria-expanded", "true");

  await userEvent.click(field(/^Dims at/));

  expect(screen.queryByRole("group", { name: "Dim time" })).not.toBeInTheDocument();
});

test("SET-10 one picker at a time", async () => {
  renderView();

  await userEvent.click(field(/^Dims at/));
  await userEvent.click(field(/^Wakes at/));

  expect(screen.queryByRole("group", { name: "Dim time" })).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Wake time" })).toBeInTheDocument();
});

test("SET-10 a picked time changes that set at once", async () => {
  const props = renderView({ ambient: SPLIT, initialPick: "wknd.e" });

  const picker = screen.getByRole("group", { name: "Wake time" });

  await userEvent.click(within(picker).getByRole("button", { name: "10 AM" }));

  expect(props.onChange).toHaveBeenCalledWith({ ...SPLIT, wknd: { start: "21:00", end: "10:00" } });
});

test("SET-10 Done closes the picker", async () => {
  renderView({ initialPick: "all.s" });

  await userEvent.click(screen.getByRole("button", { name: "Done" }));

  expect(screen.queryByRole("group", { name: "Dim time" })).not.toBeInTheDocument();
});

test("SET-10 the 24-hour clock shows 24 hour cells and no AM/PM", () => {
  renderView({ clock: "24h", initialPick: "all.s" });

  const picker = screen.getByRole("group", { name: "Dim time" });

  expect(within(picker).queryByRole("button", { name: "PM" })).not.toBeInTheDocument();
  expect(
    within(within(picker).getByRole("group", { name: "Hour" })).getAllByRole("button"),
  ).toHaveLength(24);
});

test("SET-10 the same dim and wake time reads Same as dim time and the bar reads Not set", () => {
  renderView({ ambient: { ...DEFAULT_AMBIENT, all: { start: "18:00", end: "18:00" } } });

  expect(screen.getByRole("alert")).toHaveTextContent("Same as dim time");
  expect(screen.getByText("Not set")).toBeInTheDocument();
  expect(screen.queryByText(/hr/)).not.toBeInTheDocument();
});

test("SET-10 Over 24 hours has one bar per set with its range", () => {
  renderView({ ambient: SPLIT });

  expect(screen.getByText("Over 24 hours")).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "Sun – Thu nights: 6:00 PM – 7:30 AM" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "Fri & Sat nights: 9:00 PM – 9:00 AM" }),
  ).toBeInTheDocument();
});

test("SET-10 Off hides the times and says the screen stays bright", () => {
  renderView({ ambient: { ...DEFAULT_AMBIENT, mode: "off" } });

  expect(screen.queryByRole("button", { name: /^Dims at/ })).not.toBeInTheDocument();
  expect(screen.getByText("The screen stays bright all day and night.")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("SET-10 the wake line follows the idle timeout (SET-07)", () => {
  renderView();

  expect(
    screen.getByText("After a touch it dims again when nobody has touched it for 3 min."),
  ).toBeInTheDocument();
});

test("SET-10 the wake line names the chosen minutes", () => {
  renderView({ idleTimeout: { on: true, minutes: 12 } });

  expect(
    screen.getByText("After a touch it dims again when nobody has touched it for 12 min."),
  ).toBeInTheDocument();
});

test("SET-10 with the idle timeout off the screen stays awake until the next ambient start", () => {
  renderView({ idleTimeout: { on: false, minutes: 3 } });

  expect(
    screen.getByText("After a touch it stays awake until the next ambient start."),
  ).toBeInTheDocument();
});

test("SET-10 Preview opens Ambient and ‹ Settings goes back", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: "Preview" }));
  await userEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(props.onPreview).toHaveBeenCalled();
  expect(props.onBack).toHaveBeenCalled();
});
