import { render, screen } from "@testing-library/react";
import { Wind } from "lucide-react";
import { WeatherNow } from "./WeatherNow";

const labels = { high: "H", low: "L", feelsLike: "Feels like" };

test("TODAY-08 WeatherNow shows location, temperature, condition and the high/low line", () => {
  const { container } = render(
    <WeatherNow
      location="Portland, OR"
      temp={64}
      condition="Partly cloudy"
      icon="cloud-sun"
      high={68}
      low={51}
      feelsLike={62}
      labels={labels}
    />,
  );

  expect(screen.getByText("Portland, OR")).toBeInTheDocument();
  expect(screen.getByText("64°")).toBeInTheDocument();
  expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
  expect(screen.getByText("H 68° · L 51° · Feels like 62°")).toBeInTheDocument();
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("WX-02 WeatherNow shows no unit letter and no empty high/low line", () => {
  render(
    <WeatherNow location="Portland, OR" temp={18} condition="Clear" icon="sun" labels={labels} />,
  );

  expect(screen.getByText("18°")).toBeInTheDocument();
  expect(screen.queryByText(/^H /)).not.toBeInTheDocument();
});

test("WX-01 WeatherNow lists its details", () => {
  render(
    <WeatherNow
      location="Portland, OR · Now"
      temp={64}
      condition="Partly cloudy"
      icon="cloud-sun"
      labels={labels}
      details={[
        { label: "Wind", value: "8 mph NW", icon: Wind },
        { label: "Humidity", value: "62%" },
      ]}
    />,
  );

  expect(screen.getByText("Wind")).toBeInTheDocument();
  expect(screen.getByText("8 mph NW")).toBeInTheDocument();
  expect(screen.getByText("Humidity")).toBeInTheDocument();
  expect(screen.getByText("62%")).toBeInTheDocument();
});
