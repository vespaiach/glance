import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillTabs } from "./PillTabs";
import { SettingsRow } from "./SettingsRow";

test("SET-04 SettingsRow shows its title, description and control", () => {
  render(
    <SettingsRow title="Clock" description="Used for every time on the screen">
      <PillTabs options={["12-hour", "24-hour"]} value="12-hour" onChange={() => {}} />
    </SettingsRow>,
  );

  expect(screen.getByText("Clock")).toBeInTheDocument();
  expect(screen.getByText("Used for every time on the screen")).toBeInTheDocument();
  expect(screen.getByRole("group")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Clock/ })).not.toBeInTheDocument();
});

test("SET-03 SettingsRow with onClick is one button that reports taps", async () => {
  const onClick = vi.fn();
  render(
    <SettingsRow
      title="Background"
      description="Photo, slideshow or the plain season palette"
      onClick={onClick}
    >
      Season color
    </SettingsRow>,
  );

  await userEvent.click(screen.getByRole("button", { name: /Background.*Season color/ }));

  expect(onClick).toHaveBeenCalledTimes(1);
});

test("SET-05 SettingsRow with a switch is one switch named by its title and described by its text", () => {
  render(
    <SettingsRow
      title="Hide sidebar when idle"
      description="After 15 seconds without a touch. Any tap brings it back."
      checked
      onCheckedChange={() => {}}
    />,
  );

  const toggle = screen.getByRole("switch", { name: "Hide sidebar when idle" });

  expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(toggle).toHaveAccessibleDescription(
    "After 15 seconds without a touch. Any tap brings it back.",
  );
});

test("SET-05 tapping anywhere on a switch row flips it", async () => {
  const onCheckedChange = vi.fn();
  render(
    <SettingsRow
      title="Hide sidebar when idle"
      description="After 15 seconds without a touch. Any tap brings it back."
      checked={false}
      onCheckedChange={onCheckedChange}
    />,
  );

  await userEvent.click(
    screen.getByText("After 15 seconds without a touch. Any tap brings it back."),
  );

  expect(onCheckedChange).toHaveBeenCalledWith(true);
});
