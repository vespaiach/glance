import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReminderStrip } from "./ReminderStrip";

const strip = {
  color: "lime",
  eyebrow: "In 15 min · 11:00 AM · Nghe · Food bank",
  title: "Volunteer shift",
  label: "Reminder",
  actionLabel: "Details",
} as const;

test("NOTIF-03 the strip is a status named Reminder showing its eyebrow and title", () => {
  render(<ReminderStrip {...strip} onOpen={() => {}} />);

  const status = screen.getByRole("status", { name: "Reminder" });

  expect(status).toHaveTextContent("In 15 min · 11:00 AM · Nghe · Food bank");

  expect(status).toHaveTextContent("Volunteer shift");
});

test("NOTIF-03 Details opens the event once", async () => {
  const onOpen = vi.fn();
  render(<ReminderStrip {...strip} onOpen={onOpen} />);

  await userEvent.click(screen.getByRole("button", { name: "Details" }));

  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("NOTIF-03 a tap anywhere on the strip opens the event", async () => {
  const onOpen = vi.fn();
  render(<ReminderStrip {...strip} onOpen={onOpen} />);

  await userEvent.click(screen.getByText("Volunteer shift"));

  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("NOTIF-05 the strip takes no focus when it shows or is tapped", async () => {
  render(<input aria-label="Title" />);
  const field = screen.getByRole("textbox", { name: "Title" });
  field.focus();

  render(<ReminderStrip {...strip} onOpen={() => {}} />);

  expect(field).toHaveFocus();

  await userEvent.click(screen.getByRole("button", { name: "Details" }));

  expect(field).toHaveFocus();
});

test("NOTIF-05 the strip is not in the tab order", async () => {
  render(
    <>
      <input aria-label="Title" />
      <ReminderStrip {...strip} onOpen={() => {}} />
    </>,
  );
  screen.getByRole("textbox", { name: "Title" }).focus();

  await userEvent.tab();

  expect(document.body).toHaveFocus();
});
