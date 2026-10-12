import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventRow } from "./EventRow";

const review = {
  start: "10:30",
  end: "11:15",
  title: "Design review",
  location: "Kitchen table",
  nowLabel: "Now",
};

test("spec§4.2 EventRow shows start, end, title and location", () => {
  render(<EventRow {...review} status="upcoming" />);

  expect(screen.getByText("10:30")).toBeInTheDocument();
  expect(screen.getByText("– 11:15")).toBeInTheDocument();
  expect(screen.getByText("Design review")).toBeInTheDocument();
  expect(screen.getByText("Kitchen table")).toBeInTheDocument();
  expect(screen.queryByText("Now")).not.toBeInTheDocument();
});

test("TPK-08 EventRow with no end shows only the start", () => {
  render(<EventRow {...review} end={undefined} status="upcoming" />);

  expect(screen.getByText("10:30")).toBeInTheDocument();
  expect(screen.queryByText(/–/)).not.toBeInTheDocument();
});

test("STATUS-01 a running EventRow shows the now pill", () => {
  render(<EventRow {...review} status="now" />);

  expect(screen.getByText("Now")).toBeInTheDocument();
});

test("STATUS-01 a past EventRow strikes its title through", () => {
  render(<EventRow {...review} status="past" />);

  expect(screen.getByText("Design review").tagName).toBe("S");
});

test("TODAY-03 EventRow with onClick is a button that reports taps", async () => {
  const onClick = vi.fn();
  render(<EventRow {...review} status="upcoming" onClick={onClick} />);

  const row = screen.getByRole("button", { name: /Design review/ });
  await userEvent.click(row);

  expect(row).toHaveAttribute("type", "button");
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("spec§4.2 EventRow without onClick is not a button", () => {
  render(<EventRow {...review} status="upcoming" />);

  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
