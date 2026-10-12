import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloudSun } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

test("spec§4.2 EmptyState shows its title and body with a decorative icon", () => {
  const { container } = render(
    <EmptyState
      icon={CloudSun}
      title="Weather needs a location"
      body="Set the city once and the forecast stays current."
    />,
  );

  expect(screen.getByText("Weather needs a location")).toBeInTheDocument();
  expect(screen.getByText("Set the city once and the forecast stays current.")).toBeInTheDocument();
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("spec§4.2 EmptyState shows its eyebrow above the title", () => {
  render(<EmptyState icon={CloudSun} eyebrow="Family photos · 0" title="No photos yet" />);

  expect(screen.getByText("Family photos · 0")).toBeInTheDocument();
});

test("spec§4.2 EmptyState renders its one action", async () => {
  const onClick = vi.fn();
  render(
    <EmptyState
      icon={CloudSun}
      title="Weather needs a location"
      action={<Button onClick={onClick}>Set location</Button>}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Set location" }));

  expect(onClick).toHaveBeenCalledTimes(1);
});
