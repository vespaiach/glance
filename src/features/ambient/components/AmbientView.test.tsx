import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { AmbientView } from "./AmbientView";

const BASE: ComponentProps<typeof AmbientView> = {
  season: "fall",
  time: new Date(2026, 9, 9, 19, 12),
  clock: "12h",
  offline: false,
  weather: { kind: "empty" },
  unit: "F",
  nextEvent: { kind: "empty" },
  dim: 0.5,
  onWake: () => {},
};

test("AMB-01 the top row shows the season and month and the screen label", () => {
  render(<AmbientView {...BASE} />);

  expect(screen.getByText("Fall · October")).toBeInTheDocument();
  expect(screen.getByText("Glance")).toBeInTheDocument();
  expect(screen.queryByText("Offline · showing saved data")).not.toBeInTheDocument();
});

test("AMB-01 the top row shows the offline notice while offline", () => {
  render(<AmbientView {...BASE} offline />);

  expect(screen.getByText("Offline · showing saved data")).toBeInTheDocument();
});

test("AMB-04 the caption invites a wake tap", () => {
  render(<AmbientView {...BASE} />);

  expect(screen.getByText("Click or tap anywhere to wake")).toBeInTheDocument();
});
