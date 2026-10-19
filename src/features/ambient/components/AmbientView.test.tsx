import { fireEvent, render, screen } from "@testing-library/react";
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
    memberIds: [],
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

function seasonVideo(container: HTMLElement): HTMLVideoElement | null {
  return container.querySelector("video");
}

function photoBackdrop(container: HTMLElement): Element | null {
  return container.querySelector("[data-backdrop]");
}

test("AMB-09 the season's video plays muted and looped, hidden from assistive tech", () => {
  const { container } = render(<AmbientView {...BASE} />);

  const video = seasonVideo(container);

  expect(video).toHaveAttribute("src", "/videos/fall.mp4");
  expect(video?.muted).toBe(true);
  expect(video?.loop).toBe(true);
  expect(video?.autoplay).toBe(true);
  expect(video).toHaveAttribute("playsinline");
  expect(video?.closest("[aria-hidden='true']")).not.toBeNull();
  expect(container.querySelector("[data-video-tint]")).not.toBeNull();
});

test("AMB-09 the video covers the photo background too", () => {
  const { container } = render(<AmbientView {...BASE} photoSrc="/photo.jpg" />);

  expect(seasonVideo(container)).not.toBeNull();
  expect(photoBackdrop(container)).not.toBeNull();
});

test("AMB-09 a missing or failing video shows the AMB-06 background with no label", () => {
  const { container } = render(<AmbientView {...BASE} photoSrc="/photo.jpg" />);

  const video = seasonVideo(container);

  if (video) fireEvent.error(video);

  expect(seasonVideo(container)).toBeNull();
  expect(container.querySelector("[data-video-tint]")).toBeNull();
  expect(photoBackdrop(container)).not.toBeNull();
  expect(screen.queryByText(/mp4/)).not.toBeInTheDocument();
});

test("AMB-09 a new season tries its own video after another season's failed", () => {
  const { container, rerender } = render(<AmbientView {...BASE} />);

  const video = seasonVideo(container);

  if (video) fireEvent.error(video);

  rerender(<AmbientView {...BASE} season="winter" />);

  expect(seasonVideo(container)).toHaveAttribute("src", "/videos/winter.mp4");
});

test("AMB-09 a video that failed before the page was interactive also falls back", () => {
  Object.defineProperty(HTMLMediaElement.prototype, "error", {
    configurable: true,
    get: () => ({ code: 4 }),
  });

  const { container } = render(<AmbientView {...BASE} />);

  expect(seasonVideo(container)).toBeNull();

  Reflect.deleteProperty(HTMLMediaElement.prototype, "error");
});
