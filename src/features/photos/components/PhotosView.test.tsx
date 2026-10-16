import { render, screen, within } from "@testing-library/react";
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
    selected: 0,
    playing: true,
    uploads: [],
    online: true,
    canUpload: true,
    breakpoint: "wide",
    photoSrc: (id, variant) => `/photos/${id}/${variant}`,
    onSelect: vi.fn<(index: number) => void>(),
    onStep: vi.fn<(delta: number) => void>(),
    onTogglePlay: vi.fn<() => void>(),
    onUpload: vi.fn<() => void>(),
    onRetry: vi.fn<(id: string) => void>(),
    onRemove: vi.fn<(id: string) => void>(),
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

  expect(screen.getByText("Family photos · 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show Cannon Beach" })).toHaveTextContent(
    "Cannon BeachSep 6",
  );
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

test("PHOTO-05 with no photos the view explains and offers Upload photos", async () => {
  const props = renderView({ state: { kind: "empty" } });

  expect(screen.getByText("Family photos · 0")).toBeInTheDocument();
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
  expect(screen.getByText("Family photos · 0")).toBeInTheDocument();
});

test("PHOTO-08 each failure names its reason and only network failures can be retried", async () => {
  const props = renderView({ uploads: [TOO_LARGE, NOT_A_PHOTO, NETWORK] });

  const alerts = screen.getAllByRole("alert").map((alert) => alert.textContent);

  expect(alerts).toEqual(["Too large · 20 MB max", "Not a photo", "Didn’t upload"]);
  expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(3);
  expect(screen.getByRole("status")).toHaveTextContent("3 photos didn’t upload");

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0] as HTMLElement);

  expect(props.onRetry).toHaveBeenCalledWith("u6");
  expect(props.onRemove).toHaveBeenCalledWith("u4");
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

test("spec§5.4 the phone has no Upload or Upload photos", () => {
  renderView({ canUpload: false, online: false });

  expect(screen.queryByRole("button", { name: "Upload" })).not.toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  renderView({ canUpload: false, state: { kind: "empty" } });

  expect(screen.queryByRole("button", { name: "Upload photos" })).not.toBeInTheDocument();
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
