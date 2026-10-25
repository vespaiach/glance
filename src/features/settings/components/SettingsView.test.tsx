import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Photo } from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import { GB } from "@/domain/storage";
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
    breakpoint: "large",
    onChange: vi.fn(),
    onOpenBackground: vi.fn(),
    onOpenLocation: vi.fn(),
    onOpenAmbient: vi.fn(),
    signOut: { kind: "closed" },
    onSignOut: vi.fn(),
    onSignOutThisDevice: vi.fn(),
    onSignOutAll: vi.fn(),
    onCancelSignOut: vi.fn(),
    deleteAccount: { kind: "closed" },
    counts: undefined,
    onDeleteAccount: vi.fn(),
    onToggleDeleteAccount: vi.fn(),
    onConfirmDeleteAccount: vi.fn(),
    onCancelDeleteAccount: vi.fn(),
    screens: [KITCHEN],
    storage: undefined,
    now: NOW,
    tz: TZ,
    online: true,
    qr: { tile: { kind: "closed" }, secondsLeft: 180 },
    onShowQr: vi.fn(),
    onCloseQr: vi.fn(),
    phone: { kind: "unsupported" },
    onAllowPush: vi.fn(),
    onTurnOffPush: vi.fn(),
    ...overrides,
  };

  render(<SettingsView {...props} />);

  return props;
}

function radios(name: string) {
  return within(screen.getByRole("radiogroup", { name }));
}

function checkedRadio(name: string) {
  return radios(name)
    .getAllByRole("radio")
    .find((radio) => radio.ariaChecked === "true")?.textContent;
}

function idleSlider() {
  return screen.getByRole("slider", { name: "Minutes before going back to Today" });
}

function notesSlider() {
  return screen.getByRole("slider", { name: "Days before notes are removed" });
}

function rowsText() {
  return screen.getAllByText(
    /^(Location|Season|Background|Clock|Temperature|Notifications|Chime|Hide sidebar when idle)$/,
  );
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

  expect(checkedRadio("Season")).toBe("Auto");
  expect(screen.getByText("Follows the month · now Fall")).toBeInTheDocument();
});

test("SET-02 a fixed season reads Fixed to that season", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, season: "winter" }, season: "winter" });

  expect(checkedRadio("Season")).toBe("Winter");
  expect(screen.getByText("Fixed to Winter")).toBeInTheDocument();
});

test("SET-02 the season radios list Auto and the four seasons in order", () => {
  renderView();

  expect(
    radios("Season")
      .getAllByRole("radio")
      .map((radio) => radio.textContent),
  ).toEqual(["Auto", "Spring", "Summer", "Fall", "Winter"]);
});

test("SET-02 choosing a season saves it", async () => {
  const props = renderView();

  await userEvent.click(radios("Season").getByRole("radio", { name: "Spring" }));

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

test("SET-04 the clock radios save 12-hour or 24-hour", async () => {
  const props = renderView();

  expect(checkedRadio("Clock")).toBe("12-hour");
  expect(screen.getByText("Used for every time on the screen")).toBeInTheDocument();

  await userEvent.click(radios("Clock").getByRole("radio", { name: "24-hour" }));

  expect(props.onChange).toHaveBeenCalledWith({ clock: "24h" });
});

test("SET-05 the temperature radios save Fahrenheit or Celsius", async () => {
  const props = renderView();

  expect(checkedRadio("Temperature")).toBe("Fahrenheit");
  expect(screen.getByText("Weather is shown without a unit letter")).toBeInTheDocument();

  await userEvent.click(radios("Temperature").getByRole("radio", { name: "Celsius" }));

  expect(props.onChange).toHaveBeenCalledWith({ tempUnit: "C" });
});

test("SET-05 NOTIF-08 the Notifications rows sit between Temperature and Hide sidebar when idle, the last row", () => {
  renderView();

  expect(rowsText().map((row) => row.textContent)).toEqual([
    "Location",
    "Season",
    "Background",
    "Clock",
    "Temperature",
    "Notifications",
    "Chime",
    "Hide sidebar when idle",
  ]);
});

test("SET-05 the Hide sidebar when idle switch shows and saves the setting", async () => {
  const props = renderView({ settings: { ...DEFAULT_SETTINGS, hideSidebarWhenIdle: true } });

  const toggle = screen.getByRole("switch", { name: "Hide sidebar when idle" });

  expect(toggle).toHaveAttribute("aria-checked", "true");

  await userEvent.click(toggle);

  expect(props.onChange).toHaveBeenCalledWith({ hideSidebarWhenIdle: false });
});

test("SET-05 the Hide sidebar when idle switch says it hides after 15 seconds", () => {
  renderView();

  expect(
    screen.getByRole("switch", { name: "Hide sidebar when idle" }),
  ).toHaveAccessibleDescription("After 15 seconds without a touch. Any tap brings it back.");
});

test("NOTIF-08 Notifications for everyone offers Off, 15 and 30 min before, on 15 by default", () => {
  renderView();

  expect(
    radios("Notifications for everyone")
      .getAllByRole("radio")
      .map((radio) => radio.textContent),
  ).toEqual(["Off", "15 min before", "30 min before"]);
  expect(checkedRadio("Notifications for everyone")).toBe("15 min before");
  expect(screen.getByText("15 min before each event, on this screen and on phones")).toBeVisible();
});

test.each([
  [30, "30 min before", "30 min before each event, on this screen and on phones"],
  ["off", "Off", "Off for everyone, whatever each event is set to"],
] as const)("NOTIF-08 the %s lead time is checked with its sub-line", (notifyLead, label, sub) => {
  renderView({ settings: { ...DEFAULT_SETTINGS, notifyLead } });

  expect(checkedRadio("Notifications for everyone")).toBe(label);
  expect(screen.getByText(sub)).toBeVisible();
});

test.each([
  ["Off", "off"],
  ["30 min before", 30],
] as const)("NOTIF-08 picking %s saves the lead time", async (label, notifyLead) => {
  const props = renderView();

  await userEvent.click(radios("Notifications for everyone").getByRole("radio", { name: label }));

  expect(props.onChange).toHaveBeenCalledWith({ notifyLead });
});

test("NOTIF-08 Chime and This phone keep their values while Notifications is Off", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, notifyLead: "off" }, phone: { kind: "on" } });

  expect(screen.getByRole("switch", { name: "Chime" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("switch", { name: "Chime" })).toHaveAccessibleDescription(
    "Plays once when a reminder shows. Never during quiet hours.",
  );
  expect(screen.getByRole("button", { name: "Turn off" })).toBeInTheDocument();
});

test("NOTIF-08 the Chime switch shows and saves the setting", async () => {
  const props = renderView();

  const chime = screen.getByRole("switch", { name: "Chime" });

  expect(chime).toHaveAttribute("aria-checked", "true");

  await userEvent.click(chime);

  expect(props.onChange).toHaveBeenCalledWith({ chime: false });
});

test("NOTIF-08 This phone is hidden where push is unsupported", () => {
  renderView();

  expect(screen.queryByText("This phone")).not.toBeInTheDocument();
});

test("NOTIF-08 This phone offers Allow notifications and asks on tap", async () => {
  const props = renderView({ phone: { kind: "ask" } });

  expect(screen.getByText("Get reminders when Glance is closed.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Allow notifications" }));

  expect(props.onAllowPush).toHaveBeenCalled();
});

test("NOTIF-08 while the prompt is up Allow notifications is disabled", () => {
  renderView({ phone: { kind: "asking" } });

  expect(screen.getByRole("button", { name: "Allow notifications" })).toBeDisabled();
});

test("NOTIF-08 once allowed This phone reads On with Turn off", async () => {
  const props = renderView({ phone: { kind: "on" } });

  expect(screen.getByText("On")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Turn off" }));

  expect(props.onTurnOffPush).toHaveBeenCalled();
});

test("NOTIF-08 while turning off the Turn off button is disabled", () => {
  renderView({ phone: { kind: "turning-off" } });

  expect(screen.getByRole("button", { name: "Turn off" })).toBeDisabled();
});

test("NOTIF-08 blocked by the browser shows the settings note in place of the button", () => {
  renderView({ phone: { kind: "denied" } });

  expect(
    screen.getByText("Notifications are off for Glance in this browser’s settings."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Allow notifications" })).not.toBeInTheDocument();
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

test("SET-07 Back to Today after shows the minutes on the slider with the switch on", () => {
  renderView();

  expect(screen.getByRole("switch", { name: "Back to Today after" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(idleSlider()).toHaveValue("3");
  expect(idleSlider()).toBeEnabled();
  expect(screen.getByText("3 min")).toBeInTheDocument();
  expect(screen.getByText("without a touch")).toBeInTheDocument();
  expect(screen.getByText("1 min")).toBeInTheDocument();
  expect(screen.getByText("15 min", { selector: "span" })).toBeInTheDocument();
});

test("SET-07 moving the Back to Today slider saves the minutes", () => {
  const props = renderView();

  fireEvent.change(idleSlider(), { target: { value: "9" } });

  expect(props.onChange).toHaveBeenCalledWith({ idleTimeout: { on: true, minutes: 9 } });
});

test("SET-07 turning Back to Today off keeps the minutes", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("switch", { name: "Back to Today after" }));

  expect(props.onChange).toHaveBeenCalledWith({ idleTimeout: { on: false, minutes: 3 } });
});

test("SET-07 Back to Today off disables the slider and reads Off with the kept minutes", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, idleTimeout: { on: false, minutes: 12 } } });

  expect(idleSlider()).toBeDisabled();
  expect(idleSlider()).toHaveValue("12");
  expect(screen.getByText("12 min")).toBeInTheDocument();
  expect(screen.getByText("Off · stays on the current view")).toBeInTheDocument();
});

test("SET-07 turning Back to Today on brings the kept minutes back", async () => {
  const props = renderView({
    settings: { ...DEFAULT_SETTINGS, idleTimeout: { on: false, minutes: 12 } },
  });

  await userEvent.click(screen.getByRole("switch", { name: "Back to Today after" }));

  expect(props.onChange).toHaveBeenCalledWith({ idleTimeout: { on: true, minutes: 12 } });
});

test("SET-07 Remove notes after shows the days on the slider with the switch on", () => {
  renderView({ settings: { ...DEFAULT_SETTINGS, noteExpiry: { on: true, days: 1 } } });

  expect(screen.getByRole("switch", { name: "Remove notes after" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(notesSlider()).toHaveValue("1");
  expect(notesSlider()).toHaveAttribute("aria-valuetext", "1 day");
  expect(screen.getByText("after posting")).toBeInTheDocument();
  expect(screen.getByText("30 days")).toBeInTheDocument();
});

test("SET-07 moving the Remove notes slider saves the days", () => {
  const props = renderView();

  fireEvent.change(notesSlider(), { target: { value: "30" } });

  expect(props.onChange).toHaveBeenCalledWith({ noteExpiry: { on: true, days: 30 } });
});

test("SET-07 Remove notes off disables the slider, keeps the days and turns back on with them", async () => {
  const props = renderView({
    settings: { ...DEFAULT_SETTINGS, noteExpiry: { on: false, days: 14 } },
  });

  expect(notesSlider()).toBeDisabled();
  expect(screen.getByText("14 days")).toBeInTheDocument();
  expect(screen.getByText("Off · notes stay until deleted")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("switch", { name: "Remove notes after" }));

  expect(props.onChange).toHaveBeenCalledWith({ noteExpiry: { on: true, days: 14 } });
});

test("SET-08 the account card shows the initial, name and email and signs out", async () => {
  const props = renderView();

  const card = within(screen.getByRole("region", { name: "Account" }));

  expect(card.getByText("M")).toBeInTheDocument();
  expect(card.getByText("Maria")).toBeInTheDocument();
  expect(card.getByText("maria@example.com")).toBeInTheDocument();
  expect(card.getByText("This device or every device.")).toBeInTheDocument();

  await userEvent.click(card.getByRole("button", { name: "Sign out" }));

  expect(props.onSignOut).toHaveBeenCalled();
});

test("SET-15 the account card ends with a Terms of Service link that opens /terms in a new tab", () => {
  renderView();

  const links = within(screen.getByRole("region", { name: "Account" })).getAllByRole("link");

  const terms = links.at(-1);

  expect(terms).toHaveAccessibleName("Terms of Service");
  expect(terms).toHaveAttribute("href", "/terms");
  expect(terms).toHaveAttribute("target", "_blank");
  expect(terms?.getAttribute("rel")).toContain("noopener");
});

test("SET-15 a Guide row above Terms of Service opens /guide in a new tab", () => {
  renderView();

  const links = within(screen.getByRole("region", { name: "Account" })).getAllByRole("link");

  const guide = links.at(-2);

  expect(guide).toHaveAccessibleName("Guide");
  expect(guide).toHaveAttribute("href", "/guide");
  expect(guide).toHaveAttribute("target", "_blank");
  expect(guide?.getAttribute("rel")).toContain("noopener");
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

test("SIGNIN-15 while the code is made the tile shows an empty code at 3:00", () => {
  renderView({ qr: { tile: { kind: "issuing" }, secondsLeft: 180 } });

  const card = accountCard();
  expect(card.getByRole("img", { name: "Sign-in code" }).querySelector("path")).toBeNull();
  expect(card.getByText("Code expires in 3:00")).toBeInTheDocument();
});

test("SIGNIN-15 a code that can't be made says so and Try again asks again", async () => {
  const props = renderView({ qr: { tile: { kind: "failed" }, secondsLeft: 180 } });

  const card = accountCard();
  expect(card.getByText("Couldn’t make a code. Try again.")).toBeInTheDocument();
  expect(card.queryByText(/Code expires/)).toBeNull();

  await userEvent.click(card.getByRole("button", { name: "Try again" }));

  expect(props.onShowQr).toHaveBeenCalled();
});

test("SIGNIN-15 offline Try again is disabled", () => {
  renderView({ online: false, qr: { tile: { kind: "failed" }, secondsLeft: 180 } });

  expect(accountCard().getByRole("button", { name: "Try again" })).toBeDisabled();
});

test("SET-13 photo storage shows what's left, what's used and a meter between the name and the screens", () => {
  renderView({ storage: { used: 3.2 * GB, limit: 5 * GB } });

  const card = screen.getByRole("region", { name: "Account" });
  const meter = within(card).getByRole("meter", { name: "Photo storage used" });

  expect(meter).toHaveAttribute("aria-valuetext", "3.2 GB of 5 GB used");
  expect(meter).toHaveAttribute("aria-valuenow", "3.2");
  expect(meter).toHaveAttribute("aria-valuemax", "5");
  expect(within(card).getByText("1.8 GB left")).toBeInTheDocument();
  expect(within(card).getByText("Shared by every screen on this account.")).toBeInTheDocument();
  expect(
    within(card)
      .getByText("Photo storage")
      .compareDocumentPosition(within(card).getByText("1 screen signed in")),
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

test("SET-13 from 90% the tile warns it's almost full, in MB under 1 GB", () => {
  renderView({ storage: { used: 4.6 * GB, limit: 5 * GB } });

  expect(screen.getByText("400 MB left")).toBeInTheDocument();
  expect(
    screen.getByText("Almost full. Delete photos in Photos to make room."),
  ).toBeInTheDocument();
});

test("SET-13 at the limit the tile reads No space left", () => {
  renderView({ storage: { used: 5 * GB, limit: 5 * GB } });

  expect(screen.getByText("No space left")).toBeInTheDocument();
  expect(
    screen.getByText("Storage full. New photos can’t be added until some are deleted in Photos."),
  ).toBeInTheDocument();
});

test("SET-13 the tile is hidden until the usage is read", () => {
  renderView({ storage: undefined });

  expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  expect(screen.queryByText("Photo storage")).not.toBeInTheDocument();
});

test("SET-13 offline the tile is hidden", () => {
  renderView({ online: false, storage: { used: GB, limit: 5 * GB } });

  expect(screen.queryByRole("meter")).not.toBeInTheDocument();
});
