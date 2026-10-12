import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeField } from "./TimeField";

const labels = { noEnd: "No end time", change: "Change" };

const base = { labels, clock: "12h" as const, open: false, onToggle: () => {} };

test("TPK-01 TimeField shows its label, the time and AM/PM", () => {
  render(<TimeField {...base} label="Starts" value={10 * 60 + 30} />);

  expect(screen.getByText("Starts")).toBeInTheDocument();
  expect(screen.getByText("10:30")).toBeInTheDocument();
  expect(screen.getByText("AM")).toBeInTheDocument();
});

test("TPK-01 TimeField shows the length on the right", () => {
  render(<TimeField {...base} label="Ends" value={12 * 60} length={90} />);

  expect(screen.getByText("1 hr 30 min")).toBeInTheDocument();
});

test("TPK-01 TimeField is a button named '{label}, {time}. Change'", () => {
  render(<TimeField {...base} label="Starts" value={10 * 60 + 41} />);

  expect(screen.getByRole("button", { name: "Starts, 10:41 AM. Change" })).toHaveAttribute(
    "type",
    "button",
  );
});

test("TPK-01 TimeField reports whether its picker is open with aria-expanded", () => {
  const { rerender } = render(<TimeField {...base} label="Starts" value={600} />);

  expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");

  rerender(<TimeField {...base} label="Starts" value={600} open />);

  expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
});

test("TPK-01 TimeField shows its error below as an alert tied to the button", () => {
  render(<TimeField {...base} label="Ends" value={600} error="Ends before it starts" />);

  const alert = screen.getByRole("alert");

  expect(alert).toHaveTextContent("Ends before it starts");
  expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", alert.id);
});

test("TPK-02 tapping TimeField asks to toggle its picker", async () => {
  const onToggle = vi.fn();
  render(<TimeField {...base} label="Starts" value={600} onToggle={onToggle} />);

  await userEvent.click(screen.getByRole("button"));

  expect(onToggle).toHaveBeenCalledTimes(1);
});

test("TPK-08 TimeField with no value reads 'No end time' and shows no length", () => {
  render(<TimeField {...base} label="Ends" value={undefined} />);

  expect(screen.getByText("No end time")).toBeInTheDocument();
  expect(screen.queryByText("AM")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ends, No end time. Change" })).toBeInTheDocument();
});

test("TPK-09 TimeField in 24-hour shows the padded hour and no AM/PM", () => {
  render(<TimeField {...base} label="Starts" value={9 * 60 + 5} clock="24h" />);

  expect(screen.getByText("09:05")).toBeInTheDocument();
  expect(screen.queryByText("AM")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Starts, 09:05. Change" })).toBeInTheDocument();
});
