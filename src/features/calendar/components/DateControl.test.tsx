import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateControl } from "./DateControl";

test("CAL-02 shows the year, month and selected day, and a tap opens the picker", async () => {
  const onOpen = vi.fn();

  render(
    <DateControl
      year="2026"
      month="October"
      weekday="Fri"
      date={9}
      name="Friday, October 9"
      onOpen={onOpen}
    />,
  );

  const control = screen.getByRole("button", { name: "Friday, October 9. Pick a date" });
  expect(control).toHaveAttribute("aria-haspopup", "dialog");
  expect(control).toHaveTextContent("2026October");
  expect(control).toHaveTextContent("Fri9");

  await userEvent.click(control);

  expect(onOpen).toHaveBeenCalledOnce();
});
