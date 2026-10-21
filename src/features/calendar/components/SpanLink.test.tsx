import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { SpanLink } from "./SpanLink";

const base: ComponentProps<typeof SpanLink> = {
  on: false,
  outside: 0,
  clock: "12h",
  onToggle: () => {},
};

test("CAL-06 off reads Show all 24 hours", () => {
  render(<SpanLink {...base} />);

  const link = screen.getByRole("button", { name: "Show all 24 hours" });
  expect(link).toHaveAttribute("aria-pressed", "false");
});

test("CAL-06 off counts the plans outside 5 AM to 9 PM", () => {
  const { rerender } = render(<SpanLink {...base} outside={1} />);

  expect(screen.getByRole("button", { name: "Show all 24 hours · 1 more plan" })).toBeVisible();

  rerender(<SpanLink {...base} outside={3} />);

  expect(screen.getByRole("button", { name: "Show all 24 hours · 3 more plans" })).toBeVisible();
});

test("CAL-06 on reads Show 5 AM – 9 PM only, with no count", () => {
  render(<SpanLink {...base} on outside={2} />);

  const link = screen.getByRole("button", { name: "Show 5 AM – 9 PM only" });
  expect(link).toHaveAttribute("aria-pressed", "true");
});

test("CAL-06 on the 24-hour clock it reads Show 05:00 – 21:00 only", () => {
  render(<SpanLink {...base} on clock="24h" />);

  expect(screen.getByRole("button", { name: "Show 05:00 – 21:00 only" })).toBeVisible();
});

test("CAL-06 tapping the link toggles 24 hours", async () => {
  const onToggle = vi.fn();
  render(<SpanLink {...base} onToggle={onToggle} />);

  await userEvent.click(screen.getByRole("button", { name: "Show all 24 hours" }));

  expect(onToggle).toHaveBeenCalledOnce();
});
