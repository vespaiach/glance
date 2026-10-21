import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { deviceTimeZone } from "@/domain/zone";
import { AmbientView } from "./AmbientView";

const tz = deviceTimeZone();

const BASE: ComponentProps<typeof AmbientView> = {
  season: "fall",
  time: new Date(2026, 9, 9, 19, 12),
  clock: "12h",
  tz,
  offline: false,
  signedOut: false,
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

test("AMB-07 signed out by the server shows the notice in the top row", () => {
  render(<AmbientView {...BASE} signedOut />);

  expect(screen.getByText("Signed out · tap to sign in")).toBeInTheDocument();
  expect(screen.getByText("Glance")).toBeInTheDocument();
});

test("AMB-07 a signed-in screen has no signed-out notice", () => {
  render(<AmbientView {...BASE} />);

  expect(screen.queryByText("Signed out · tap to sign in")).not.toBeInTheDocument();
});

test("AMB-03 an all-day event reads All day on its own date in any zone", () => {
  const event = {
    id: "0195f0a0-0000-7000-8000-000000000016",
    startAt: "2026-10-16T00:00:00.000Z",
    allDay: true as const,
    title: "No school",
    location: "Lincoln Elementary",
    everyone: true,
    tagIds: [],
  };

  render(
    <AmbientView
      {...BASE}
      tz="America/Los_Angeles"
      time={new Date("2026-10-09T19:00:00Z")}
      nextEvent={{ kind: "ready", data: [event] }}
    />,
  );

  expect(
    screen.getByText("Fri, Oct 16 · All day · No school, Lincoln Elementary"),
  ).toBeInTheDocument();
});

function photoBackdrop(container: HTMLElement): Element | null {
  return container.querySelector("[data-backdrop]");
}

test("AMB-06 the background is the photo or the season, with no video", () => {
  const { container } = render(<AmbientView {...BASE} photoSrc="/photo.jpg" />);

  expect(container.querySelector("video")).toBeNull();
  expect(photoBackdrop(container)).not.toBeNull();
});
