import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { AccountSettings, Photo } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import type { UploadTile } from "@/features/photos";
import { BackgroundView } from "./BackgroundView";

const tz = deviceTimeZone();

type Props = ComponentProps<typeof BackgroundView>;

const photo = (n: number, title: string): Photo => ({
  id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  title,
  takenOn: "2026-09-06",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  createdAt: "2026-10-05T19:00:00.000Z",
});

const COAST = photo(1, "Cannon Beach");

const APPLES = photo(2, "Apple picking");

const PHOTOS = [COAST, APPLES];

const RUNNING: UploadTile = { id: "u1", title: "IMG_2041", state: "uploading", percent: 64 };

const background = (change: Partial<AccountSettings["background"]> = {}) => ({
  ...DEFAULT_SETTINGS.background,
  photoId: COAST.id,
  ...change,
});

function renderView(overrides: Partial<Props> = {}) {
  const props: Props = {
    state: { kind: "ready", data: PHOTOS },
    retryIn: 1,
    onRetrySync: vi.fn<() => void>(),
    background: background(),
    now: new Date(2026, 9, 9, 10, 41),
    tz,
    season: "fall",
    uploads: [],
    online: true,
    canUpload: true,
    breakpoint: "large",
    photoSrc: (id, variant) => `/photos/${id}/${variant}`,
    onChange: vi.fn(),
    onBack: vi.fn(),
    onUpload: vi.fn(),
    onRetry: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };

  render(<BackgroundView {...props} />);

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

function drawing(season: string) {
  return screen.getByRole("button", { name: `Use ${season} drawing as background` });
}

function thumb(title: string) {
  return screen.getByRole("button", { name: `Use ${title} as background` });
}

test("BG-01 the back link returns to Settings", async () => {
  const props = renderView();

  expect(screen.getByRole("heading", { name: "Background" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(props.onBack).toHaveBeenCalled();
});

test("BG-01 the mode tabs are Season, Photo, Slideshow and Blank", () => {
  renderView();

  expect(
    pills("Background")
      .getAllByRole("button")
      .map((pill) => pill.textContent),
  ).toEqual(["Season", "Photo", "Slideshow", "Blank"]);
  expect(selectedPill("Background")).toBe("Season");
});

test("BG-01 the mode tabs show the saved mode and save a new one", async () => {
  const props = renderView({ background: background({ mode: "photo" }) });

  expect(selectedPill("Background")).toBe("Photo");

  await userEvent.click(pills("Background").getByRole("button", { name: "Slideshow" }));

  expect(props.onChange).toHaveBeenCalledWith({ mode: "slideshow" });
});

test("BG-02 the grid lists every photo, then the Upload photo tile", async () => {
  const props = renderView();

  expect(screen.getByText("Family photos · select one")).toBeInTheDocument();
  expect(thumb("Cannon Beach")).toBeInTheDocument();
  expect(thumb("Apple picking")).toBeInTheDocument();

  expect(screen.getByRole("button", { name: "Upload photo" })).toBeEnabled();

  await userEvent.click(screen.getByRole("button", { name: "Upload photo" }));

  expect(props.onUpload).toHaveBeenCalled();
});

test("BG-02 Slideshow labels the grid with every photo in rotation", () => {
  renderView({ background: background({ mode: "slideshow" }) });

  expect(screen.getByText("Family photos · all 2 in rotation")).toBeInTheDocument();
});

test("BG-02 uploading tiles come before the photos", () => {
  renderView({ uploads: [RUNNING] });

  const items = within(screen.getByRole("list", { name: "Family photos" })).getAllByRole(
    "listitem",
  );

  expect(items[0]).toHaveTextContent("IMG_2041");
  expect(items[1]).toHaveTextContent("Cannon Beach");
});

test("BG-02 offline the Upload photo tile reads Upload when online and is disabled", () => {
  renderView({ online: false });

  expect(screen.getByRole("button", { name: "Upload when online" })).toBeDisabled();
});

test("spec§5.4 on small the Upload photo tile is hidden", () => {
  renderView({ canUpload: false });

  expect(screen.queryByRole("button", { name: "Upload photo" })).not.toBeInTheDocument();
});

test("BG-02 the background photo's thumb is pressed, none in Season", () => {
  renderView({ background: background({ mode: "photo", photoId: APPLES.id }) });

  expect(thumb("Apple picking")).toHaveAttribute("aria-pressed", "true");
  expect(thumb("Cannon Beach")).toHaveAttribute("aria-pressed", "false");
});

test("BG-03 in Season no thumb is pressed", () => {
  renderView();

  expect(thumb("Cannon Beach")).toHaveAttribute("aria-pressed", "false");
});

test("BG-03 tapping a thumb in Season picks it in Photo mode", async () => {
  const props = renderView();

  await userEvent.click(thumb("Apple picking"));

  expect(props.onChange).toHaveBeenCalledWith({ mode: "photo", photoId: APPLES.id });
});

test("BG-03 tapping a photo in Blank switches to Photo", async () => {
  const props = renderView({ background: background({ mode: "blank" }) });

  await userEvent.click(thumb("Apple picking"));

  expect(props.onChange).toHaveBeenCalledWith({ mode: "photo", photoId: APPLES.id });
});

test("BG-03 the drawings row lists the four seasons and labels the current one now", () => {
  renderView({ season: "fall" });

  expect(screen.getByText("Season drawings · select one")).toBeInTheDocument();
  expect(
    within(screen.getByRole("list", { name: "Season drawings" }))
      .getAllByRole("button")
      .map((each) => each.textContent),
  ).toEqual(["Spring", "Summer", "Fall · now", "Winter"]);
});

test("BG-03 the drawing in use is pressed, none outside Season", () => {
  renderView({ background: background({ mode: "season", drawing: "winter" }) });

  expect(drawing("Winter")).toHaveAttribute("aria-pressed", "true");
  expect(drawing("Fall")).toHaveAttribute("aria-pressed", "false");

  cleanup();

  renderView({ background: background({ mode: "blank", drawing: "winter" }) });

  expect(drawing("Winter")).toHaveAttribute("aria-pressed", "false");
});

test("BG-03 tapping a drawing picks it and switches to Season", async () => {
  const props = renderView({ background: background({ mode: "photo" }) });

  await userEvent.click(drawing("Spring"));

  expect(props.onChange).toHaveBeenCalledWith({ mode: "season", drawing: "spring" });
});

test("BG-04 the Dim photo tabs save Off, Light or Strong", async () => {
  const props = renderView();

  expect(selectedPill("Dim photo")).toBe("Light");

  await userEvent.click(pills("Dim photo").getByRole("button", { name: "Strong" }));

  expect(props.onChange).toHaveBeenCalledWith({ dim: 0.4 });
});

test("BG-04 Change photo shows only in Slideshow and saves the interval", async () => {
  renderView({ background: background({ mode: "photo" }) });

  expect(screen.queryByRole("group", { name: "Change photo" })).not.toBeInTheDocument();

  cleanup();

  const props = renderView({ background: background({ mode: "slideshow" }) });

  expect(selectedPill("Change photo")).toBe("Daily");

  await userEvent.click(pills("Change photo").getByRole("button", { name: "Hourly" }));

  expect(props.onChange).toHaveBeenCalledWith({ rotate: "hourly" });
});

test.each([
  [
    { mode: "season" },
    "The fall drawing is the background. It changes with the season until you pick one; panels stay solid on top.",
  ],
  [
    { mode: "season", drawing: "spring" },
    "The spring drawing is the background on every screen. Panels stay solid on top.",
  ],
  [{ mode: "blank" }, "Screens use a plain light gray background. Pick a photo to switch."],
  [{ mode: "photo" }, "Cannon Beach is the background on every screen. Panels stay solid on top."],
  [
    { mode: "slideshow", rotate: "weekly" },
    "Showing Cannon Beach. The photo changes weekly; panels stay solid on top.",
  ],
] as const)("BG-05 the caption for %o", (change, caption) => {
  renderView({ background: background(change) });

  expect(screen.getByText(caption)).toBeInTheDocument();
});

test("BG-04 the preview has a label", () => {
  renderView();

  expect(screen.getByRole("img", { name: "Preview" })).toBeInTheDocument();
});
