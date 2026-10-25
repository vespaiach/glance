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
  brightness: "medium",
  onWake: () => {},
};

const CONFERENCE = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  startAt: new Date(2026, 9, 14, 16).toISOString(),
  title: "Parent-teacher conference",
  location: "Lincoln Elementary",
  everyone: true,
  tagIds: [],
  notify: true as const,
};

const WEATHER = {
  location: "Portland, OR",
  fetchedAt: new Date(2026, 9, 9, 18, 32).toISOString(),
  current: {
    temp: 56,
    condition: "lightRain",
    icon: "cloud-rain" as const,
    high: 68,
    low: 51,
    feelsLike: 54,
    windMph: 8,
    windDir: "NW",
    humidity: 80,
    uv: 0,
    sunset: new Date(2026, 9, 9, 18).toISOString(),
  },
  hourly: [],
  daily: [{ date: "2026-10-10", icon: "cloud-rain" as const, high: 60, low: 48, precip: 80 }],
};

test("AMB-01 with no location the top row shows the season and no wordmark", () => {
  render(<AmbientView {...BASE} />);

  expect(screen.getByText("Fall")).toBeInTheDocument();
  expect(screen.queryByText("Glance")).not.toBeInTheDocument();
  expect(screen.queryByText("Offline · showing saved data")).not.toBeInTheDocument();
});

test("AMB-01 with a location the top row shows its place", () => {
  render(<AmbientView {...BASE} place="Portland, OR" />);

  expect(screen.getByText("Portland, OR")).toBeInTheDocument();
  expect(screen.queryByText("Fall")).not.toBeInTheDocument();
});

test("AMB-01 the top row shows the offline notice while offline", () => {
  render(<AmbientView {...BASE} offline />);

  expect(screen.getByText("Offline · showing saved data")).toBeInTheDocument();
});

test("AMB-01 signed out shows only the signed-out status, even offline", () => {
  render(<AmbientView {...BASE} signedOut offline />);

  expect(screen.getByText("Signed out · tap to sign in")).toBeInTheDocument();
  expect(screen.queryByText("Offline · showing saved data")).not.toBeInTheDocument();
});

test("AMB-04 the hint invites a wake tap", () => {
  render(<AmbientView {...BASE} />);

  expect(screen.getByText("Tap anywhere to wake")).toBeInTheDocument();
});

test("AMB-04 signed out, the hint invites a sign-in tap", () => {
  render(<AmbientView {...BASE} signedOut />);

  expect(screen.getByText("Tap anywhere to sign in")).toBeInTheDocument();
});

test("AMB-07 a signed-in screen has no signed-out notice", () => {
  render(<AmbientView {...BASE} />);

  expect(screen.queryByText("Signed out · tap to sign in")).not.toBeInTheDocument();
});

test("AMB-03 the next rainy day tomorrow reads Tomorrow", () => {
  render(
    <AmbientView {...BASE} place="Portland, OR" weather={{ kind: "ready", data: [WEATHER] }} />,
  );

  expect(screen.getByText("Low 51° overnight · Tomorrow 80% rain")).toBeInTheDocument();
  expect(screen.queryByText(/^Updated/)).not.toBeInTheDocument();
});

test("AMB-03 offline, the weather adds when it was updated", () => {
  render(
    <AmbientView
      {...BASE}
      offline
      place="Portland, OR"
      weather={{ kind: "ready", data: [WEATHER] }}
    />,
  );

  expect(screen.getByText("Updated 6:32 PM")).toBeInTheDocument();
});

test("AMB-03 the next event has an eyebrow with its day and start, the title and the place", () => {
  render(<AmbientView {...BASE} nextEvent={{ kind: "ready", data: [CONFERENCE] }} />);

  expect(screen.getByText("Next · Wed, Oct 14 · 4:00 PM")).toBeInTheDocument();
  expect(screen.getByText("Parent-teacher conference")).toBeInTheDocument();
  expect(screen.getByText("Lincoln Elementary")).toBeInTheDocument();
});

test("AMB-03 no next event with a location suggests adding events", () => {
  render(<AmbientView {...BASE} place="Portland, OR" />);

  expect(screen.getByText("Next event")).toBeInTheDocument();
  expect(screen.getByText("Nothing scheduled")).toBeInTheDocument();
  expect(screen.getByText("Add events from Today")).toBeInTheDocument();
});

test("AMB-03 no next event and no location suggests adding both", () => {
  render(<AmbientView {...BASE} />);

  expect(screen.getByText("Add events and a location from Today")).toBeInTheDocument();
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
    notify: true as const,
  };

  render(
    <AmbientView
      {...BASE}
      tz="America/Los_Angeles"
      time={new Date("2026-10-09T19:00:00Z")}
      nextEvent={{ kind: "ready", data: [event] }}
    />,
  );

  expect(screen.getByText("Next · Fri, Oct 16 · All day")).toBeInTheDocument();
});

function photoBackdrop(container: HTMLElement): Element | null {
  return container.querySelector("[data-backdrop]");
}

test("AMB-06 the background is the photo or the season, with no video", () => {
  const { container } = render(<AmbientView {...BASE} photoSrc="/photo.jpg" />);

  expect(container.querySelector("video")).toBeNull();
  expect(photoBackdrop(container)).not.toBeNull();
});
