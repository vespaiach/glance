import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForecastDay } from "./ForecastDay";

test("WX-01 ForecastDay shows the day, high, low and precipitation", () => {
  render(<ForecastDay day="Sat" icon="cloud-rain" high={59} low={48} precip={80} />);

  expect(screen.getByText("Sat")).toBeInTheDocument();
  expect(screen.getByText("59°")).toBeInTheDocument();
  expect(screen.getByText("48°")).toBeInTheDocument();
  expect(screen.getByText("80%")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("WX-01 ForecastDay shows precipitation only when present", () => {
  render(<ForecastDay day="Mon" icon="sun" high={66} low={49} />);

  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});

test("spec§4.2 ForecastDay with onClick is a button that reports taps", async () => {
  const onClick = vi.fn();
  render(<ForecastDay day="Sun" icon="cloud" high={61} low={47} onClick={onClick} />);

  await userEvent.click(screen.getByRole("button", { name: /Sun/ }));

  expect(onClick).toHaveBeenCalledTimes(1);
});
