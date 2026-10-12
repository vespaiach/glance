import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeatherFailure } from "./WeatherFailure";

test("WX-05 says the forecast service isn't responding and when it tries again", () => {
  render(<WeatherFailure location="Portland, OR" minutes={2} onRetry={() => {}} />);

  expect(screen.getByRole("status")).toHaveTextContent("Weather unavailable");
  expect(screen.getByText("Portland, OR")).toBeInTheDocument();
  expect(
    screen.getByText("The forecast service isn’t responding. Trying again in 2 min."),
  ).toBeInTheDocument();
});

test("WX-05 Try again calls back", async () => {
  const onRetry = vi.fn<() => void>();

  render(<WeatherFailure location="Portland, OR" minutes={1} onRetry={onRetry} />);

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(onRetry).toHaveBeenCalledTimes(1);
});
