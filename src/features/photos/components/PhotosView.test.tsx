import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { Photo } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import type { UploadTile } from "../uploads";
import { PhotosView } from "./PhotosView";

const tz = deviceTimeZone();

const photo = (n: number, title: string, takenOn: string, place: string): Photo => ({
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  title,
  takenOn,
  place,
  createdAt: "2026-10-05T19:00:00.000Z",
});

const APPLES = photo(1, "Apple picking", "2026-09-27", "Sauvie Island");

const PUMPKINS = photo(2, "Pumpkin patch", "2026-10-04", "Family outing");

const COAST = photo(3, "Cannon Beach", "2026-09-06", "Summer trip");

const PHOTOS = [APPLES, PUMPKINS, COAST];

const RUNNING: UploadTile = {
  id: "u1",
  title: "IMG_2041",
  preview: "/up.svg",
  state: "uploading",
  percent: 64,
};

const WAITING: UploadTile = { id: "u2", title: "IMG_2043", state: "uploading", percent: 0 };

const PAUSED: UploadTile = { id: "u3", title: "IMG_2041", state: "paused", percent: 40 };

const TOO_LARGE: UploadTile = { id: "u4", title: "IMG_3307", state: "failed", reason: "too-large" };

const NOT_A_PHOTO: UploadTile = {
  id: "u5",
  title: "Recipe card",
  state: "failed",
  reason: "not-a-photo",
};

const NETWORK: UploadTile = {
  id: "u6",
  title: "Halloween costumes",
  state: "failed",
  reason: "network",
};

type Props = ComponentProps<typeof PhotosView>;

function renderView(overrides: Partial<Props> = {}) {
  const props: Props = {
    state: { kind: "ready", data: PHOTOS },
    retryIn: 1,
    onRetrySync: vi.fn<() => void>(),
    clock: "12h",
    tz,
    thisYear: 2026,
    selected: 0,
    playing: true,
    uploads: [],
    online: true,
    breakpoint: "large",
    deleting: false,
    backgroundId: undefined,
    photoSrc: (id, variant) => `/photos/${id}/${variant}`,
    onSelect: vi.fn<(index: number) => void>(),
    onEdit: vi.fn<(photoId: string) => void>(),
    onStep: vi.fn<(delta: number) => void>(),
    onTogglePlay: vi.fn<() => void>(),
    onFullScreen: vi.fn<() => void>(),
    onUpload: vi.fn<() => void>(),
    onChooseFiles: vi.fn<() => void>(),
    onCloseQr: vi.fn<() => void>(),
    onRetry: vi.fn<(id: string) => void>(),
    onRetryAll: vi.fn<() => void>(),
    onRemove: vi.fn<(id: string) => void>(),
    onClear: vi.fn<() => void>(),
    onAskDelete: vi.fn<() => void>(),
    onCancelDelete: vi.fn<() => void>(),
    onDelete: vi.fn<(photoId: string) => void>(),
    onSetBackground: vi.fn<(photoId: string) => void>(),
    onOpenBackground: vi.fn<() => void>(),
    ...overrides,
  };

  render(<PhotosView {...props} />);

  return props;
}

test("spec§8.6 the featured photo shows its image, date · place and title", () => {
  renderView({ selected: 1 });

  expect(screen.getByRole("img", { name: "Pumpkin patch" })).toHaveAttribute(
    "src",
    `/photos/${PUMPKINS.id}/display`,
  );
  expect(screen.getByText("Oct 4 · Family outing")).toBeInTheDocument();
});

test("spec§8.6 the panel counts the photos and lists a thumb per photo with its date", () => {
  renderView();

  expect(screen.getByText("Photos · 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show Cannon Beach" })).toHaveTextContent(
    "Cannon BeachSep 6",
  );
});

test("PHOTO-11 the featured actions are Set as background, Edit details and Delete, then the slideshow buttons", () => {
  renderView();

  const names = screen
    .getAllByRole("button")
    .filter((button) => !button.getAttribute("aria-label")?.startsWith("Show "))
    .map((button) => button.textContent || button.getAttribute("aria-label"));

  expect(names.slice(0, 7)).toEqual([
    "Set as background",
    "Edit details",
    "Delete",
    "Previous photo",
    "Pause slideshow",
    "Next photo",
    "Full screen",
  ]);
});

test("PHOTO-11 Edit details edits the featured photo", async () => {
  const props = renderView({ selected: 1 });

  await userEvent.click(screen.getByRole("button", { name: "Edit details" }));

  expect(props.onEdit).toHaveBeenCalledWith(PUMPKINS.id);
});

test("PHOTO-13 Delete asks to confirm", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(props.onAskDelete).toHaveBeenCalledTimes(1);
  expect(props.onDelete).not.toHaveBeenCalled();
});

test("PHOTO-13 the confirm turns Delete into Delete photo and Cancel, and Delete photo deletes the featured photo", async () => {
  const props = renderView({ selected: 1, deleting: true });

  const confirm = screen.getByRole("alertdialog", { name: "Delete this photo?" });

  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

  await userEvent.click(within(confirm).getByRole("button", { name: "Delete photo" }));
  await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));

  expect(props.onDelete).toHaveBeenCalledWith(PUMPKINS.id);
  expect(props.onCancelDelete).toHaveBeenCalledTimes(1);
});

test("PHOTO-13 Delete and its confirm are hidden offline", () => {
  renderView({ online: false, deleting: true });

  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("A11Y-02 the featured photo's thumb is pressed", () => {
  renderView({ selected: 2 });

  expect(screen.getByRole("button", { name: "Show Cannon Beach" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Show Apple picking" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("PHOTO-01 tapping a thumb features it", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: "Show Cannon Beach" }));

  expect(props.onSelect).toHaveBeenCalledWith(2);
});

test("PHOTO-01 the chevrons step back and forward", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: "Previous photo" }));
  await userEvent.click(screen.getByRole("button", { name: "Next photo" }));

  expect(props.onStep).toHaveBeenNthCalledWith(1, -1);
  expect(props.onStep).toHaveBeenNthCalledWith(2, 1);
});

test("PHOTO-14 Full screen comes last, and it and the featured photo open full screen", async () => {
  const props = renderView();

  const controls = screen.getAllByRole("button", { name: /photo|slideshow|Full screen/ });

  expect(controls.at(-1)).toHaveAccessibleName("Full screen");

  await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
  await userEvent.click(screen.getByRole("img", { name: "Apple picking" }));

  expect(props.onFullScreen).toHaveBeenCalledTimes(2);
});

test("PHOTO-02 a playing slideshow offers Pause, a paused one Play", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: "Pause slideshow" }));

  expect(props.onTogglePlay).toHaveBeenCalledTimes(1);

  renderView({ playing: false });

  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
});

test("PHOTO-03 Upload asks for files", async () => {
  const props = renderView();

  await userEvent.click(screen.getByRole("button", { name: "Upload" }));

  expect(props.onUpload).toHaveBeenCalledTimes(1);
});

test("PHOTO-03 the Add from your phone panel shows the code, Choose files here and Done above the grid", async () => {
  const props = renderView({ qr: { url: "https://glance.example.com/api/auth/verify?t=a" } });

  const panel = screen.getByRole("group", { name: "Add photos from your phone" });

  expect(
    within(panel).getByRole("img", { name: "Code to add photos from your phone" }),
  ).toBeInTheDocument();
  expect(within(panel).getByText("Scan to add photos")).toBeInTheDocument();
  expect(
    within(panel).getByText(
      "Point your phone’s camera at the code and pick photos. They show here as they finish uploading.",
    ),
  ).toBeInTheDocument();

  await userEvent.click(within(panel).getByRole("button", { name: "Choose files here" }));
  await userEvent.click(within(panel).getByRole("button", { name: "Done" }));

  expect(props.onChooseFiles).toHaveBeenCalledTimes(1);
  expect(props.onCloseQr).toHaveBeenCalledTimes(1);
});

test("PHOTO-05 with no photos on large and normal the card shows the code and Choose files here", async () => {
  const props = renderView({
    state: { kind: "empty" },
    qr: { url: "https://glance.example.com/x" },
  });

  const card = screen.getByRole("group", { name: "Add photos from your phone" });

  expect(within(card).getByText("Scan to add photos")).toBeInTheDocument();
  expect(within(card).queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Upload photos" })).not.toBeInTheDocument();

  await userEvent.click(within(card).getByRole("button", { name: "Choose files here" }));

  expect(props.onChooseFiles).toHaveBeenCalledTimes(1);
});

test("PHOTO-05 with no photos the view explains and offers Upload photos", async () => {
  const props = renderView({ state: { kind: "empty" } });

  expect(screen.getByText("Photos · 0")).toBeInTheDocument();
  expect(screen.getByText("No photos yet")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Upload family photos to show them here, as the picture of the day and as a background.",
    ),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Upload photos" }));

  expect(props.onUpload).toHaveBeenCalledTimes(1);
});

test("PHOTO-06 an upload tile comes first with its progress and percent", () => {
  renderView({ uploads: [RUNNING] });

  const bar = screen.getByRole("progressbar", { name: "Uploading IMG_2041" });

  expect(bar).toHaveAttribute("aria-valuenow", "64");
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("IMG_204164%");
  expect(screen.getByRole("status")).toHaveTextContent("Uploading IMG_204164%");
});

test("PHOTO-06 an upload at 0% reads Waiting and several uploads are counted", () => {
  renderView({ uploads: [RUNNING, WAITING] });

  expect(screen.getByText("Waiting")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Uploading 2 photos32%");
});

test("PHOTO-07 a first upload leaves the featured frame waiting for finished photos", () => {
  renderView({ state: { kind: "empty" }, uploads: [RUNNING] });

  expect(screen.getByText("Your photos show here once they finish uploading.")).toBeInTheDocument();
  expect(screen.queryByText("No photos yet")).not.toBeInTheDocument();
  expect(screen.getByText("Photos · 0")).toBeInTheDocument();
});

test("PHOTO-08 each failure names its reason and only network failures can be retried", async () => {
  const props = renderView({ uploads: [TOO_LARGE, NOT_A_PHOTO, NETWORK] });

  const alerts = screen.getAllByRole("alert");

  expect(alerts.map((alert) => alert.getAttribute("aria-label"))).toEqual([
    "IMG_3307: Too large · 20 MB max",
    "Recipe card: Not a photo",
    "Halloween costumes: Didn’t upload",
  ]);
  expect(alerts.map((alert) => alert.textContent)).toEqual(["Over 20 MB", "Not a photo", "Failed"]);
  expect(screen.getAllByText("Not uploaded")).toHaveLength(3);
  expect(
    within(alerts[2] as HTMLElement).getByRole("button", { name: "Try again" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(3);
  expect(screen.getByRole("status")).toHaveTextContent("3 photos didn’t upload");

  await userEvent.click(
    within(alerts[2] as HTMLElement).getByRole("button", { name: "Try again" }),
  );
  await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0] as HTMLElement);

  expect(props.onRetry).toHaveBeenCalledWith("u6");
  expect(props.onRemove).toHaveBeenCalledWith("u4");
});

test("PHOTO-08 the row's Try again retries the network failures and Clear removes every failed tile", async () => {
  const props = renderView({ uploads: [TOO_LARGE, NETWORK] });

  const row = screen.getByRole("status");

  await userEvent.click(within(row).getByRole("button", { name: "Try again" }));
  await userEvent.click(within(row).getByRole("button", { name: "Clear" }));

  expect(props.onRetryAll).toHaveBeenCalledTimes(1);
  expect(props.onClear).toHaveBeenCalledTimes(1);
});

test("PHOTO-08 without a network failure the row offers only Clear", () => {
  renderView({ uploads: [TOO_LARGE, NOT_A_PHOTO] });

  const row = screen.getByRole("status");

  expect(within(row).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "Clear" })).toBeInTheDocument();
});

test("PHOTO-08 one failure reads in the singular", () => {
  renderView({ uploads: [NETWORK] });

  expect(screen.getByRole("status")).toHaveTextContent("1 photo didn’t upload");
});

test("PHOTO-09 offline disables Upload and shows the paused uploads", () => {
  renderView({ uploads: [PAUSED], online: false });

  expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  expect(screen.getByText("Paused")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Offline · 1 upload paused until back online",
  );
});

test("PHOTO-09 offline with no photos disables Upload photos beside the offline pill", () => {
  renderView({ state: { kind: "empty" }, online: false });

  expect(screen.getByRole("button", { name: "Upload photos" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Offline · upload when back online");
});

test("LOAD-02 photos that are still loading show a skeleton", () => {
  renderView({ state: { kind: "loading" } });

  expect(screen.getByLabelText("Loading photos")).toBeInTheDocument();
});

test("PHOTO-06 the thumb grid lists uploads before the finished photos", () => {
  renderView({ uploads: [RUNNING] });

  const grid = screen.getByRole("list", { name: "Family photos" });

  expect(within(grid).getAllByRole("listitem")[0]).toHaveTextContent("IMG_2041");
});

test("PHOTO-15 a featured photo that isn't the background offers Set as background", async () => {
  const props = renderView({ selected: 1, backgroundId: APPLES.id });

  await userEvent.click(screen.getByRole("button", { name: "Set as background" }));

  expect(props.onSetBackground).toHaveBeenCalledWith(PUMPKINS.id);
  expect(screen.queryByRole("button", { name: "Background now · Change" })).toBeNull();
});

test("PHOTO-15 the featured photo that is the background reads Background now · Change and opens Background", async () => {
  const props = renderView({ selected: 1, backgroundId: PUMPKINS.id });

  await userEvent.click(screen.getByRole("button", { name: "Background now · Change" }));

  expect(props.onOpenBackground).toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Set as background" })).toBeNull();
});

test("PHOTO-16 a portrait featured photo is contained once it loads, a landscape one stays cropped", () => {
  renderView({ selected: 1 });

  const image = screen.getByRole("img", { name: "Pumpkin patch" });

  expect(image).not.toHaveClass("FeaturedPhoto__styles.portrait");

  loadImage(image, 1000, 1400);

  expect(image).toHaveClass("FeaturedPhoto__styles.portrait");

  loadImage(image, 1600, 1000);

  expect(image).not.toHaveClass("FeaturedPhoto__styles.portrait");
});

function loadImage(image: HTMLElement, width: number, height: number) {
  Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(image, "naturalHeight", { value: height, configurable: true });
  Object.defineProperty(image, "complete", { value: true, configurable: true });

  fireEvent.load(image);
}
