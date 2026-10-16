import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Photo } from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import { SettingsView } from "./SettingsView";

type Props = ComponentProps<typeof SettingsView>;

const COAST: Photo = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  createdAt: "2026-10-05T19:00:00.000Z",
};

const NOW = new Date("2026-10-09T17:41:00.000Z");

const TZ = "America/Los_Angeles";

const KITCHEN: SignedInScreen = {
  id: "kitchen",
  kind: "monitor",
  browser: "Chrome",
  lastSeenAt: NOW.toISOString(),
  current: true,
};

const SCREENS: SignedInScreen[] = [
  KITCHEN,
  {
    id: "hallway",
    kind: "monitor",
    browser: "Edge",
    lastSeenAt: "2026-10-09T17:29:00.000Z",
    current: false,
  },
  {
    id: "tablet",
    kind: "tablet",
    browser: "Safari",
    lastSeenAt: "2026-10-09T03:15:00.000Z",
    current: false,
  },
  {
    id: "phone",
    kind: "smartphone",
    browser: null,
    lastSeenAt: "2026-10-03T01:30:00.000Z",
    current: false,
  },
];

function renderView(overrides: Partial<Props> = {}) {
  const props: Props = {
    account: { name: "Maria", email: "maria@example.com" },
    settings: DEFAULT_SETTINGS,
    season: "fall",
    background: { mode: "season" },
    breakpoint: "wide",
    onChange: vi.fn(),
    onOpenBackground: vi.fn(),
    onOpenLocation: vi.fn(),
    onOpenAmbient: vi.fn(),
    onSignOut: vi.fn(),
    screens: [KITCHEN],
    now: NOW,
    tz: TZ,
    online: true,
    qr: { tile: { kind: "closed" }, secondsLeft: 300 },
    onShowQr: vi.fn(),
    onCloseQr: vi.fn(),
    ...overrides,
  };

  render(<SettingsView {...props} />);

  return props;
}

function pills(name: string) {
  return within(screen.getByRole("group", { name }));
}

function selectedPill(name: string) {
  return pills(name)
    .getAllByRole("button")
    .find((pill) => pill.ariaPressed === "true")?.textContent;
}

test("SET-01 the header names the signed-in person and email", () => {
  renderView();

  expect(screen.getByText("Screen settings")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  expect(screen.getByText(/^Signed in as/).textContent).toBe(
    "Signed in as Maria · maria@example.com",
  );
});

test("SET-02 Auto follows the month and names the season now", () => {
  renderView();

  expect(selectedPill("Season")).toBe("Auto");
  expect(screen.getByText("Follows the month · now Fall")).toBeInTheDocument();
});

test("SET-02 a fixed season reads Fixed to that season", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, season: "winter" }, season: "winter" });

  expect(selectedPill("Season")).toBe("Winter");
  expect(screen.getByText("Fixed to Winter")).toBeInTheDocument();
});

test("SET-02 choosing a season saves it", async () => {
  const props = renderView();

  await userEvent.click(pills("Season").getByRole("button", { name: "Spring" }));

  expect(props.onChange).toHaveBeenCalledWith({ season: "spring" });
});

test.each([
  [{ mode: "season" }, "Season color"],
  [{ mode: "photo", photo: COAST }, "Photo · Cannon Beach"],
  [{ mode: "slideshow", photo: COAST, rotate: "daily" }, "Slideshow · daily"],
] as const)("SET-03 the Background row summarizes %o as %s", (background, summary) => {
  renderView({ background });

  expect(screen.getByRole("button", { name: /^Background/ })).toHaveTextContent(summary);
});

test("SET-03 the Background row opens the Background page", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: /Background/ }));

  expect(props.onOpenBackground).toHaveBeenCalled();
});

test("SET-04 the clock tabs save 12-hour or 24-hour", async () => {
  const props = renderView();

  expect(selectedPill("Clock")).toBe("12-hour");
  expect(screen.getByText("Used for every time on the screen")).toBeInTheDocument();

  await userEvent.click(pills("Clock").getByRole("button", { name: "24-hour" }));

  expect(props.onChange).toHaveBeenCalledWith({ clock: "24h" });
});

test("SET-05 the temperature tabs save Fahrenheit or Celsius", async () => {
  const props = renderView();

  expect(selectedPill("Temperature")).toBe("Fahrenheit");
  expect(screen.getByText("Weather is shown without a unit letter")).toBeInTheDocument();

  await userEvent.click(pills("Temperature").getByRole("button", { name: "Celsius" }));

  expect(props.onChange).toHaveBeenCalledWith({ tempUnit: "C" });
});

test("SET-11 Hide bar when idle is the last row, under Temperature, and saves On or Off", async () => {
  const props = renderView();

  expect(selectedPill("Hide bar when idle")).toBe("On");
  expect(
    screen.getByText("After 20 seconds without a touch. Any tap brings it back."),
  ).toBeInTheDocument();

  const titles = screen.getAllByText(/^(Temperature|Hide bar when idle)$/);

  expect(titles.map((title) => title.textContent)).toEqual(["Temperature", "Hide bar when idle"]);

  await userEvent.click(pills("Hide bar when idle").getByRole("button", { name: "Off" }));

  expect(props.onChange).toHaveBeenCalledWith({ hideBarWhenIdle: false });
});

test("SET-11 shows Off when the bar stays docked", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, hideBarWhenIdle: false } });

  expect(selectedPill("Hide bar when idle")).toBe("Off");
});

test("SET-06 the Ambient tile shows the hours in the clock format and opens the Ambient screen page", async () => {
  const props = renderView();

  expect(screen.getByText("Ambient screen")).toBeInTheDocument();
  expect(screen.getByText("6:00 PM – 7:30 AM")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /^Ambient screen/ }));

  expect(props.onOpenAmbient).toHaveBeenCalled();
});

test("SET-06 the Ambient hours follow the 24-hour clock", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, clock: "24h" } });

  expect(screen.getByText("18:00 – 07:30")).toBeInTheDocument();
});

function ambientTileText() {
  return screen.getByText("Ambient screen").nextElementSibling?.textContent;
}

const WEEKENDS_DIFFER = {
  mode: "split",
  all: { start: "18:00", end: "07:30" },
  wknd: { start: "21:00", end: "09:00" },
} as const;

test("SET-06 Weekends differ shows both sets", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, ambient: WEEKENDS_DIFFER } });

  expect(
    screen.getByText("Sun – Thu 6:00 PM – 7:30 AM · Fri & Sat 9:00 PM – 9:00 AM"),
  ).toBeInTheDocument();
});

test("SET-06 a set with the same dim and wake time reads Not set", () => {
  const all = { start: "18:00", end: "18:00" };

  renderView({ settings: { ...DEFAULT_SETTINGS, ambient: { ...WEEKENDS_DIFFER, all } } });

  expect(screen.getByText("Sun – Thu Not set · Fri & Sat 9:00 PM – 9:00 AM")).toBeInTheDocument();
});

test("SET-06 every night with the same dim and wake time reads Not set", () => {
  const all = { start: "18:00", end: "18:00" };

  renderView({ settings: { ...DEFAULT_SETTINGS, ambient: { ...DEFAULT_SETTINGS.ambient, all } } });

  expect(ambientTileText()).toBe("Not set");
});

test("SET-06 Off reads Off", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, ambient: { ...WEEKENDS_DIFFER, mode: "off" } } });

  expect(ambientTileText()).toBe("Off");
});

test("SET-07 Back to Today after saves the idle timeout, Never as none", async () => {
  const props = renderView();

  expect(selectedPill("Back to Today after")).toBe("3 min");

  await userEvent.click(pills("Back to Today after").getByRole("button", { name: "1 min" }));
  await userEvent.click(pills("Back to Today after").getByRole("button", { name: "Never" }));

  expect(props.onChange).toHaveBeenCalledWith({ idleTimeout: 60 });
  expect(props.onChange).toHaveBeenCalledWith({ idleTimeout: null });
});

test("SET-07 Remove notes after saves the note expiry, Never as none", async () => {
  const props = renderView({ settings: { ...DEFAULT_SETTINGS, noteExpiry: null } });

  expect(selectedPill("Remove notes after")).toBe("Never");

  await userEvent.click(pills("Remove notes after").getByRole("button", { name: "1 day" }));

  expect(props.onChange).toHaveBeenCalledWith({ noteExpiry: "1d" });
});

test("SET-08 the account card shows the initial, name and email and signs out", async () => {
  const props = renderView();

  const card = within(screen.getByRole("region", { name: "Account" }));

  expect(card.getByText("M")).toBeInTheDocument();
  expect(card.getByText("Maria")).toBeInTheDocument();
  expect(card.getByText("maria@example.com")).toBeInTheDocument();
  expect(card.getByText("Sign out this device only.")).toBeInTheDocument();

  await userEvent.click(card.getByRole("button", { name: "Sign out" }));

  expect(props.onSignOut).toHaveBeenCalled();
});

test("SET-08 with no name yet the card falls back to the email", () => {
  renderView({ account: { name: null, email: "maria@example.com" } });

  const card = within(screen.getByRole("region", { name: "Account" }));

  expect(card.getByText("m")).toBeInTheDocument();
  expect(screen.getByText(/^Signed in as/).textContent).toBe("Signed in as maria@example.com");
});

test("SET-12 lists the signed-in screens with their type, name and when each was active", () => {
  renderView({ screens: SCREENS });

  const list = screen.getByRole("list", { name: "4 screens signed in" });

  expect(
    within(list)
      .getAllByRole("listitem")
      .map((row) => row.textContent),
  ).toEqual([
    "Chrome screenThis screen",
    "Edge screenActive 12 min ago",
    "Safari tabletActive yesterday",
    "PhoneActive Oct 2",
  ]);
  expect(
    within(list)
      .getAllByRole("img")
      .map((icon) => icon.getAttribute("aria-label")),
  ).toEqual(["Screen", "Screen", "Tablet", "Phone"]);
});

test("SET-12 a single screen reads 1 screen signed in", () => {
  renderView();

  expect(screen.getByRole("list", { name: "1 screen signed in" })).toBeInTheDocument();
  expect(screen.getByText("1 screen signed in")).toBeInTheDocument();
});

test("SET-12 a screen seen hours ago today reads in hours", () => {
  renderView({
    screens: [
      KITCHEN,
      { ...KITCHEN, id: "x", current: false, lastSeenAt: "2026-10-09T14:20:00.000Z" },
    ],
  });

  expect(screen.getByText("Active 3 hr ago")).toBeInTheDocument();
});

const CODE_URL = "https://glance.example.com/api/auth/verify?t=abc";

function accountCard() {
  return within(screen.getByRole("region", { name: "Account" }));
}

test("SIGNIN-15 Sign in another device sits under the signed-in list and opens the tile", async () => {
  const props = renderView();

  const button = accountCard().getByRole("button", { name: "Sign in another device" });
  await userEvent.click(button);

  expect(props.onShowQr).toHaveBeenCalled();
  expect(
    screen.getByRole("list", { name: "1 screen signed in" }).compareDocumentPosition(button),
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

test("SIGNIN-15 offline Sign in another device is disabled", () => {
  renderView({ online: false });

  expect(accountCard().getByRole("button", { name: "Sign in another device" })).toBeDisabled();
});

test("SIGNIN-15 the open tile shows the code, the email and the countdown in place of the button", async () => {
  const props = renderView({
    qr: { tile: { kind: "open", url: CODE_URL, issuedAt: NOW.toISOString() }, secondsLeft: 245 },
  });

  const card = accountCard();
  expect(card.queryByRole("button", { name: "Sign in another device" })).toBeNull();
  expect(card.getByRole("img", { name: "Sign-in code" }).querySelector("path")).not.toBeNull();
  expect(card.getByText("Scan to sign in")).toBeInTheDocument();
  expect(
    card.getByText(
      "Open the camera on the other device and point it at the code. It signs in with maria@example.com.",
    ),
  ).toBeInTheDocument();
  expect(card.getByText("Code expires in 4:05")).toBeInTheDocument();

  await userEvent.click(card.getByRole("button", { name: "Done" }));

  expect(props.onCloseQr).toHaveBeenCalled();
});

test("SIGNIN-15 while the code is made the tile shows an empty code at 5:00", () => {
  renderView({ qr: { tile: { kind: "issuing" }, secondsLeft: 300 } });

  const card = accountCard();
  expect(card.getByRole("img", { name: "Sign-in code" }).querySelector("path")).toBeNull();
  expect(card.getByText("Code expires in 5:00")).toBeInTheDocument();
});

test("SIGNIN-15 a code that can't be made says so and Try again asks again", async () => {
  const props = renderView({ qr: { tile: { kind: "failed" }, secondsLeft: 300 } });

  const card = accountCard();
  expect(card.getByText("Couldn’t make a code. Try again.")).toBeInTheDocument();
  expect(card.queryByText(/Code expires/)).toBeNull();

  await userEvent.click(card.getByRole("button", { name: "Try again" }));

  expect(props.onShowQr).toHaveBeenCalled();
});

test("SIGNIN-15 offline Try again is disabled", () => {
  renderView({ online: false, qr: { tile: { kind: "failed" }, secondsLeft: 300 } });

  expect(accountCard().getByRole("button", { name: "Try again" })).toBeDisabled();
});
