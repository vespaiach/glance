import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { FixtureParams } from "@/data/repos";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  synced,
} from "@/data/repos/testHarness";
import { MAX_PHOTO_BYTES } from "@/domain/photoUpload";
import { err, ok } from "@/domain/result";
import type { Photo } from "@/domain/schemas";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
import { NetworkProvider } from "@/shell/providers/network";
import { shellWrapper } from "@/shell/providers/testShell";
import { TimeZoneProvider } from "@/shell/providers/timeZone";
import { PhotosScreen } from "./PhotosScreen";

const NOW = new Date(2026, 9, 9, 10, 41);

const photo = (n: number, title: string, createdAt: string): Photo => ({
  id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  title,
  takenOn: "2026-09-27",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  place: "Sauvie Island",
  createdAt,
});

const FOREST = photo(1, "Forest Park trail", "2026-10-05T19:00:00.000Z");

const APPLES = photo(2, "Apple picking", "2026-10-05T19:04:00.000Z");

const COAST = photo(3, "Cannon Beach", "2026-10-05T19:05:00.000Z");

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-photos-screen-test");

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();

  await store.close();
});

function renderPhotos(
  params: FixtureParams = {},
  clock: "frozen" | "running" = "frozen",
  timeZone?: string,
) {
  const Shell = shellWrapper(store, clock === "frozen" ? { frozenAt: NOW } : {});

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <TimeZoneProvider timeZone={timeZone}>
        <NetworkProvider>
          <FixtureParamsProvider params={params}>{children}</FixtureParamsProvider>
        </NetworkProvider>
      </TimeZoneProvider>
    </Shell>
  );

  return render(<PhotosScreen />, { wrapper });
}

function featuredTitle() {
  return screen.getByRole("img", { name: /.+/ }).getAttribute("alt");
}

test("PHOTO-03 the newest upload is listed and featured first", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos();

  expect(await screen.findByText("Family photos · 3")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Show / }).map((thumb) => thumb.ariaLabel)).toEqual(
    ["Show Cannon Beach", "Show Apple picking", "Show Forest Park trail"],
  );
  expect(featuredTitle()).toBe("Cannon Beach");
});

test("PHOTO-01 tapping a thumb features it and the chevrons wrap at both ends", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Show Forest Park trail" }));

  expect(featuredTitle()).toBe("Forest Park trail");

  await userEvent.click(screen.getByRole("button", { name: "Next photo" }));

  expect(featuredTitle()).toBe("Cannon Beach");

  await userEvent.click(screen.getByRole("button", { name: "Previous photo" }));

  expect(featuredTitle()).toBe("Forest Park trail");
});

test("PHOTO-02 Pause and Play toggle the slideshow button", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Pause slideshow" }));

  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
});

test("PHOTO-05 with no photos the view is empty", async () => {
  await markSynced(store);

  renderPhotos();

  expect(await screen.findByText("No photos yet")).toBeInTheDocument();
});

test("PHOTO-08 upload=error opens with the three failed tiles", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos({ upload: "error" });

  expect(await screen.findAllByRole("alert")).toHaveLength(3);
});

function runningClock() {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"], now: NOW });
}

function waitSeconds(seconds: number) {
  act(() => vi.advanceTimersByTime(seconds * 1000));
}

test("PHOTO-02 the featured photo advances every 8 s while Photos is open", async () => {
  runningClock();

  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos({}, "running");

  expect(await screen.findByRole("img", { name: "Cannon Beach" })).toBeInTheDocument();

  waitSeconds(8);

  expect(featuredTitle()).toBe("Apple picking");

  waitSeconds(8);

  expect(featuredTitle()).toBe("Forest Park trail");
});

test("PHOTO-02 a paused slideshow keeps its photo", async () => {
  runningClock();

  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos({}, "running");

  await screen.findByRole("img", { name: "Cannon Beach" });

  await userEvent.click(screen.getByRole("button", { name: "Pause slideshow" }));

  waitSeconds(20);

  expect(featuredTitle()).toBe("Cannon Beach");
});

test("PHOTO-07 while photos upload the slideshow steps through finished photos only", async () => {
  runningClock();

  await store.db.photos.bulkPut([synced(COAST), synced(APPLES)]);

  renderPhotos({ upload: "progress" }, "running");

  await screen.findByRole("img", { name: "Cannon Beach" });

  waitSeconds(8);

  expect(featuredTitle()).toBe("Apple picking");

  waitSeconds(8);

  expect(featuredTitle()).toBe("Cannon Beach");
});

const chosen = (name: string, type = "image/jpeg") => new File(["x"], name, { type });

const PICNIC = photo(4, "IMG_2041", "2026-10-09T17:41:00.000Z");

function pendingUpload() {
  const upload = {
    report: (_percent: number) => {},
    finish: (_answer: Awaited<ReturnType<Harness["upload"]>>) => {},
  };

  store.upload.mockImplementation(
    (_file, _modifiedOn, onProgress) =>
      new Promise((resolve) => {
        upload.report = (percent) => act(() => onProgress(percent));
        upload.finish = resolve;
      }),
  );

  return upload;
}

async function choose(...files: File[]) {
  const user = userEvent.setup({ applyAccept: false });

  await user.upload(await screen.findByLabelText("Choose photos"), files);
}

function progress(title: string) {
  return screen.getByRole("progressbar", { name: `Uploading ${title}` });
}

test("PHOTO-10 the upload tile shows the name guessed from the file and sends its modified date in the screen's zone", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  pendingUpload();

  renderPhotos({}, "frozen", "Pacific/Kiritimati");

  await screen.findByText("Family photos · 1");

  const file = new File(["x"], "halloween-costumes-2025-10-31.jpg", {
    type: "image/jpeg",
    lastModified: Date.UTC(2026, 7, 16, 12),
  });

  await choose(file);

  expect(screen.getByText("Uploading Halloween costumes")).toBeInTheDocument();
  expect(store.upload).toHaveBeenCalledWith(file, "2026-08-17", expect.any(Function));
});

test("PHOTO-03 Upload opens the picker for several images", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos();

  const picker = await screen.findByLabelText("Choose photos");

  const click = vi.spyOn(picker, "click");

  await userEvent.click(await screen.findByRole("button", { name: "Upload" }));

  expect(click).toHaveBeenCalledTimes(1);
  expect(picker).toHaveAttribute("accept", "image/*");
  expect(picker).toHaveAttribute("multiple");
});

test("PHOTO-06 a chosen photo shows first with its progress and becomes a photo when it finishes", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  const upload = pendingUpload();

  renderPhotos();

  await screen.findByText("Family photos · 1");

  await choose(chosen("IMG_2041.jpg"));

  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByText("Waiting")).toBeInTheDocument();
  expect(screen.getByText("Uploading IMG_2041")).toBeInTheDocument();

  upload.report(40);

  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "40");

  await act(async () => upload.finish(ok(synced(PICNIC))));

  expect(await screen.findByText("Family photos · 2")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Show / })[0]).toHaveAccessibleName(
    "Show IMG_2041",
  );
});

test("PHOTO-04 a file over 20 MB fails as too large and is never sent", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos();

  const big = chosen("IMG_3307.jpg");

  Object.defineProperty(big, "size", { value: MAX_PHOTO_BYTES + 1 });

  await choose(big);

  expect(await screen.findByRole("alert")).toHaveTextContent("Too large · 20 MB max");
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(store.upload).not.toHaveBeenCalled();
});

test("PHOTO-08 Remove drops a file that is not a photo", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos();

  await choose(chosen("Recipe card.pdf", "application/pdf"));

  expect(await screen.findByRole("alert")).toHaveTextContent("Not a photo");

  await userEvent.click(screen.getByRole("button", { name: "Remove" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(store.upload).not.toHaveBeenCalled();
});

test("PHOTO-08 a network failure changes only its tile and Try again restarts it at 0%", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  store.upload.mockResolvedValueOnce(err("network"));

  const upload = pendingUpload();

  renderPhotos();

  await choose(chosen("IMG_2041.jpg"));

  expect(await screen.findByRole("alert")).toHaveTextContent("Didn’t upload");
  expect(screen.getByText("1 photo didn’t upload")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "0");
  expect(store.upload).toHaveBeenCalledTimes(2);

  await act(async () => upload.finish(ok(synced(PICNIC))));

  expect(await screen.findByText("Family photos · 2")).toBeInTheDocument();
});

async function goOffline() {
  await act(() => putSyncStatus(store, { online: false, weather: { state: "idle" } }));
}

async function goOnline() {
  await act(() => putSyncStatus(store, { online: true, weather: { state: "idle" } }));
}

test("PHOTO-09 going offline pauses an upload, and back online it is sent again from 0%", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  const upload = pendingUpload();

  renderPhotos();

  await choose(chosen("IMG_2041.jpg"));

  upload.report(40);

  await goOffline();

  expect(await screen.findByText("Paused")).toBeInTheDocument();
  expect(screen.getByText("Offline · 1 upload paused until back online")).toBeInTheDocument();

  await act(async () => upload.finish(err("network")));

  expect(screen.getByText("Paused")).toBeInTheDocument();

  await goOnline();

  expect(await screen.findByText("Uploading IMG_2041")).toBeInTheDocument();
  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "0");
  expect(store.upload).toHaveBeenCalledTimes(2);

  await act(async () => upload.finish(ok(synced(PICNIC))));

  expect(await screen.findByText("Family photos · 2")).toBeInTheDocument();
});

test("PHOTO-09 an upload still running when the screen reconnects carries on without a resend", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  const upload = pendingUpload();

  renderPhotos();

  await choose(chosen("IMG_2041.jpg"));

  upload.report(40);

  await goOffline();

  expect(await screen.findByText("Paused")).toBeInTheDocument();

  await goOnline();

  expect(await screen.findByText("Uploading IMG_2041")).toBeInTheDocument();
  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "40");
  expect(store.upload).toHaveBeenCalledTimes(1);

  await act(async () => upload.finish(ok(synced(PICNIC))));

  expect(await screen.findByText("Family photos · 2")).toBeInTheDocument();
});

test("FAIL-01 a failed first sync shows Photos unavailable with a countdown and Try again", async () => {
  await putSyncStatus(store, {
    online: true,
    error: "server",
    retryAt: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    weather: { state: "idle" },
  });

  renderPhotos();

  expect(await screen.findByText("Photos unavailable")).toBeInTheDocument();
  expect(
    screen.getByText("The Glance server isn’t responding. Trying again in 5 min."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(store.nudge).toHaveBeenCalledTimes(1);
});
