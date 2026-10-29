import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageTopBar } from "./PageTopBar";

test("EVT-05 Back is a button named by its label that goes back", async () => {
  const onBack = vi.fn();

  render(
    <PageTopBar backLabel="Back" onBack={onBack} title="New event">
      <button type="button">Save</button>
    </PageTopBar>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(screen.getByText("New event")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
});

test("EVT-05 without onBack there is no Back", () => {
  render(<PageTopBar backLabel="Back" title="New event" />);

  expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
});
