import { render, screen } from "@testing-library/react";
import { OfflinePill } from "./OfflinePill";

test("OFF-01 OfflinePill is a status with its label and saved time", () => {
  const { container } = render(
    <OfflinePill label="Offline · showing saved data" meta="Saved 2:14 PM" />,
  );

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Offline · showing saved data");
  expect(status).toHaveTextContent("Saved 2:14 PM");
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("OFF-01 OfflinePill hides the saved time when none is given", () => {
  render(<OfflinePill label="Offline · showing saved data" />);

  expect(screen.getByRole("status")).toHaveTextContent(/^Offline · showing saved data$/);
});
