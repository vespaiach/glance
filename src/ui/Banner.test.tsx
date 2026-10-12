import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloudRain } from "lucide-react";
import { Banner } from "./Banner";

test("spec§4.2 Banner shows its title and body with a decorative icon", () => {
  const { container } = render(
    <Banner
      icon={CloudRain}
      title="Rain moving in after 4 PM"
      body="Grab an umbrella if you're heading out."
    />,
  );

  expect(screen.getByText("Rain moving in after 4 PM")).toBeInTheDocument();
  expect(screen.getByText("Grab an umbrella if you're heading out.")).toBeInTheDocument();
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("spec§4.2 Banner action button reports taps", async () => {
  const onAction = vi.fn();
  render(<Banner title="Rain moving in" actionLabel="See hourly" onAction={onAction} />);

  await userEvent.click(screen.getByRole("button", { name: "See hourly" }));

  expect(onAction).toHaveBeenCalledTimes(1);
});
