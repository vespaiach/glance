import { act, cleanup, render, screen, within } from "@testing-library/react";
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
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { MAX_PHOTO_BYTES } from "@/domain/photoUpload";
import { err, ok } from "@/domain/result";
import type { Photo } from "@/domain/schemas";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
import { NetworkProvider } from "@/shell/providers/network";
import { shellWrapper } from "@/shell/providers/testShell";
import { TimeZoneProvider } from "@/shell/providers/timeZone";
import { SheetHost, useSheetHost } from "@/shell/SheetHost";
import { PhotosScreen } from "./PhotosScreen";

let search = "";

const navigation = vi.hoisted(() => ({ push: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => "/photos",
  useSearchParams: () => new URLSearchParams(search),
}));

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
  search = "";
  navigation.push.mockReset();

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
          <FixtureParamsProvider params={params}>
            <SheetHost>{children}</SheetHost>
          </FixtureParamsProvider>
        </NetworkProvider>
      </TimeZoneProvider>
    </Shell>
  );

  return render(
    <>
      <PhotosScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

const ADD_FROM_PHONE = "Add photos from your phone";

const QR_URL = "https://glance.example.com/api/auth/verify?t=abc&to=photos";

function smallScreen() {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function uploadRow(): HTMLElement {
  return screen.getByText(/didn’t upload$/).closest("[role=status]") as HTMLElement;
}

function featuredTitle() {
  return screen.getByRole("img", { name: /.+/ }).getAttribute("alt");
}

test("PHOTO-03 the newest upload is listed and featured first", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos();

  expect(await screen.findByText("Photos · 3")).toBeInTheDocument();
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

test("PHOTO-01 opened from Today’s photo, that photo is featured and the slideshow paused", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);
  search = `photo=${APPLES.id}`;

  renderPhotos();

  expect(await screen.findByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
  expect(featuredTitle()).toBe("Apple picking");
  expect(screen.getByRole("button", { name: "Show Apple picking" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
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

test("PHOTO-11 the featured photo shows its year outside this year, and the guessed hint", async () => {
  await store.db.photos.put(
    synced({
      ...COAST,
      title: "Halloween costumes",
      takenOn: "2025-10-31",
      sources: { title: "file-name", takenOn: "file-name", place: "photo-location" },
      checked: false,
    }),
  );

  renderPhotos();

  expect(await screen.findByText("Oct 31, 2025 · Sauvie Island")).toBeInTheDocument();
  expect(screen.getByText("Name and date guessed from the file name.")).toBeInTheDocument();
});

test("PHOTO-11 the thumb caption is the name and the date", async () => {
  await store.db.photos.put(synced(COAST));

  renderPhotos();

  const thumb = await screen.findByRole("button", { name: "Show Cannon Beach" });

  expect(thumb).toHaveTextContent(/^Cannon BeachSep 27$/);
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

  await screen.findByText("Photos · 1");

  const file = new File(["x"], "halloween-costumes-2025-10-31.jpg", {
    type: "image/jpeg",
    lastModified: Date.UTC(2026, 7, 16, 12),
  });

  await choose(file);

  expect(screen.getByText("Uploading Halloween costumes")).toBeInTheDocument();
  expect(store.upload).toHaveBeenCalledWith(file, "2026-08-17", expect.any(Function));
});

test("spec§5.4 on small Upload opens the picker for several images, with no QR panel", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);
  smallScreen();

  renderPhotos();

  const picker = await screen.findByLabelText("Choose photos");

  const click = vi.spyOn(picker, "click");

  await userEvent.click(await screen.findByRole("button", { name: "Upload" }));

  expect(click).toHaveBeenCalledTimes(1);
  expect(picker).toHaveAttribute("accept", "image/*");
  expect(picker).toHaveAttribute("multiple");
  expect(screen.queryByRole("group", { name: ADD_FROM_PHONE })).not.toBeInTheDocument();
  expect(store.issueQr).not.toHaveBeenCalled();
});

test("PHOTO-03 on large Upload toggles Add from your phone with a code that opens Photos", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);
  store.issueQr.mockResolvedValue(ok({ url: QR_URL }));

  renderPhotos();

  const upload = await screen.findByRole("button", { name: "Upload" });

  await userEvent.click(upload);

  expect(screen.getByRole("group", { name: ADD_FROM_PHONE })).toBeInTheDocument();
  expect(store.issueQr).toHaveBeenCalledWith("photos");

  await userEvent.click(upload);

  expect(screen.queryByRole("group", { name: ADD_FROM_PHONE })).not.toBeInTheDocument();
  expect(store.voidQr).toHaveBeenCalledWith(QR_URL);
});

test("PHOTO-03 Choose files here opens the picker and closes the panel, Done closes it", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos({ phqr: true });

  const picker = await screen.findByLabelText("Choose photos");

  const click = vi.spyOn(picker, "click");

  const panel = await screen.findByRole("group", { name: ADD_FROM_PHONE });

  await userEvent.click(within(panel).getByRole("button", { name: "Choose files here" }));

  expect(click).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("group", { name: ADD_FROM_PHONE })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Upload" }));
  await userEvent.click(screen.getByRole("button", { name: "Done" }));

  expect(screen.queryByRole("group", { name: ADD_FROM_PHONE })).not.toBeInTheDocument();
});

test("PHOTO-05 with no photos on large the empty card shows the code; on small Upload photos", async () => {
  await markSynced(store);

  const { unmount } = renderPhotos();

  expect(await screen.findByRole("group", { name: ADD_FROM_PHONE })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Upload photos" })).not.toBeInTheDocument();
  expect(store.issueQr).toHaveBeenCalledWith("photos");

  unmount();
  smallScreen();
  renderPhotos();

  expect(await screen.findByRole("button", { name: "Upload photos" })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: ADD_FROM_PHONE })).not.toBeInTheDocument();
});

test("PHOTO-08 the row's Try again retries only the network failures and Clear removes every failed tile", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);
  store.upload.mockResolvedValue(err("network"));

  renderPhotos();

  await choose(chosen("Recipe card.pdf", "application/pdf"), chosen("IMG_2041.jpg"));

  await screen.findByText("2 photos didn’t upload");

  await userEvent.click(within(uploadRow()).getByRole("button", { name: "Try again" }));

  expect(await screen.findByText("2 photos didn’t upload")).toBeInTheDocument();
  expect(store.upload).toHaveBeenCalledTimes(2);

  await userEvent.click(within(uploadRow()).getByRole("button", { name: "Clear" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText(/didn’t upload$/)).not.toBeInTheDocument();
});

test("PHOTO-06 a chosen photo shows first with its progress and becomes a photo when it finishes", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  const upload = pendingUpload();

  renderPhotos();

  await screen.findByText("Photos · 1");

  await choose(chosen("IMG_2041.jpg"));

  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByText("Waiting")).toBeInTheDocument();
  expect(screen.getByText("Uploading IMG_2041")).toBeInTheDocument();

  upload.report(40);

  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "40");

  await act(async () => upload.finish(ok(synced(PICNIC))));

  expect(await screen.findByText("Photos · 2")).toBeInTheDocument();
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

  expect(await screen.findByRole("alert")).toHaveAccessibleName("IMG_3307: Too large · 20 MB max");
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

  const failure = await screen.findByRole("alert");

  expect(failure).toHaveAccessibleName("IMG_2041: Didn’t upload");
  expect(screen.getByText("1 photo didn’t upload")).toBeInTheDocument();

  await userEvent.click(within(failure).getByRole("button", { name: "Try again" }));

  expect(progress("IMG_2041")).toHaveAttribute("aria-valuenow", "0");
  expect(store.upload).toHaveBeenCalledTimes(2);

  await act(async () => upload.finish(ok(synced(PICNIC))));

  expect(await screen.findByText("Photos · 2")).toBeInTheDocument();
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

  expect(await screen.findByText("Photos · 2")).toBeInTheDocument();
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

  expect(await screen.findByText("Photos · 2")).toBeInTheDocument();
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

test("PHOTO-11 Edit details opens Photo details for the featured photo and pauses the slideshow", async () => {
  runningClock();

  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos({}, "running");

  await screen.findByRole("img", { name: "Cannon Beach" });

  await userEvent.click(screen.getByRole("button", { name: "Edit details" }));

  waitSeconds(20);

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "photo", id: COAST.id }),
  );
  expect(featuredTitle()).toBe("Cannon Beach");
  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
});

function fullScreen() {
  return screen.getByRole("dialog", { name: /· full screen$/ });
}

test("PHOTO-14 tapping the featured photo opens it full screen, and Exit returns with it featured", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos();

  await userEvent.click(await screen.findByRole("img", { name: "Cannon Beach" }));

  expect(fullScreen()).toHaveAccessibleName("Cannon Beach · full screen");
  expect(within(fullScreen()).getByText("1 of 3")).toBeInTheDocument();

  await userEvent.click(within(fullScreen()).getByRole("button", { name: "Next photo" }));

  expect(fullScreen()).toHaveAccessibleName("Apple picking · full screen");
  expect(within(fullScreen()).getByText("2 of 3")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Exit full screen" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(featuredTitle()).toBe("Apple picking");
});

test("PHOTO-14 the chevrons wrap and Space pauses the shared slideshow", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Full screen" }));

  await userEvent.keyboard("{ArrowLeft}");

  expect(fullScreen()).toHaveAccessibleName("Forest Park trail · full screen");

  await userEvent.keyboard("[Space]{Escape}");

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(featuredTitle()).toBe("Forest Park trail");
  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
});

test("PHOTO-14 the slideshow keeps its 8 s timer in full screen", async () => {
  runningClock();

  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos({}, "running");

  await screen.findByRole("img", { name: "Cannon Beach" });

  waitSeconds(5);

  await userEvent.click(screen.getByRole("button", { name: "Full screen" }));

  waitSeconds(3);

  expect(fullScreen()).toHaveAccessibleName("Apple picking · full screen");
});

test("PHOTO-14 full=1 opens full screen with the rows, chrome=0 without them", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  const { unmount } = renderPhotos({ full: true });

  expect(
    await screen.findByRole("dialog", { name: "Cannon Beach · full screen" }),
  ).toBeInTheDocument();
  expect(screen.getByText("1 of 1")).toBeInTheDocument();

  unmount();

  renderPhotos({ full: true, chrome: "0" });

  expect(
    await screen.findByRole("dialog", { name: "Cannon Beach · full screen" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("1 of 1")).not.toBeInTheDocument();
});

test("PHOTO-14 full=1 opens nothing until a photo has finished uploading", async () => {
  await markSynced(store);

  renderPhotos({ full: true, upload: "one" });

  expect(
    await screen.findByText("Your photos show here once they finish uploading."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("PHOTO-15 Set as background makes the featured photo the Photo background, keeps the dim and pauses on it", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST)]);
  await store.db.settings.put(
    synced({
      ...DEFAULT_SETTINGS,
      accountId: store.accountId,
      background: { ...DEFAULT_SETTINGS.background, mode: "slideshow", dim: 0.4 },
    }),
  );

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Set as background" }));

  expect(
    await screen.findByRole("button", { name: "Background now · Change" }),
  ).toBeInTheDocument();
  expect((await store.db.settings.get(store.accountId))?.background).toMatchObject({
    mode: "photo",
    photoId: COAST.id,
    dim: 0.4,
  });
  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
  expect(featuredTitle()).toBe("Cannon Beach");
});

test("PHOTO-15 Background now · Change opens the Background page", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST)]);
  await store.db.settings.put(
    synced({
      ...DEFAULT_SETTINGS,
      accountId: store.accountId,
      background: { ...DEFAULT_SETTINGS.background, mode: "photo", photoId: COAST.id },
    }),
  );

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Background now · Change" }));

  expect(navigation.push).toHaveBeenCalledWith("/settings/background");
});

test("PHOTO-13 Delete pauses the slideshow and asks; Delete photo removes it and the next photo takes its place", async () => {
  runningClock();

  await store.db.photos.bulkPut([synced(FOREST), synced(COAST), synced(APPLES)]);

  renderPhotos({}, "running");

  await screen.findByRole("img", { name: "Cannon Beach" });

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  waitSeconds(20);

  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
  expect(featuredTitle()).toBe("Cannon Beach");

  await userEvent.click(screen.getByRole("button", { name: "Delete photo" }));

  expect(await screen.findByRole("img", { name: "Apple picking" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Show Cannon Beach" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
});

test("PHOTO-13 Cancel or moving to another photo ends the confirm", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST)]);

  renderPhotos();

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Next photo" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(featuredTitle()).toBe("Forest Park trail");
});

test("PHOTO-13 deleting the Photo background turns the background back to Season color", async () => {
  await store.db.photos.bulkPut([synced(FOREST), synced(COAST)]);
  await store.db.settings.put(
    synced({
      ...DEFAULT_SETTINGS,
      accountId: store.accountId,
      background: { ...DEFAULT_SETTINGS.background, mode: "photo", photoId: COAST.id },
    }),
  );

  renderPhotos({ phdel: true });

  await userEvent.click(await screen.findByRole("button", { name: "Delete photo" }));

  await vi.waitFor(async () =>
    expect((await store.db.settings.get(store.accountId))?.background.mode).toBe("season"),
  );
  expect(await store.db.photos.get(COAST.id)).toMatchObject({
    deletedAt: expect.any(String),
  });
});

test("PHOTO-13 offline there is no Delete", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos({ phdel: true });

  await screen.findByRole("img", { name: "Cannon Beach" });

  await goOffline();

  expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
});

test("PHOTO-13 phdel=1 opens with the confirm and the slideshow paused", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos({ phdel: true });

  expect(
    await screen.findByRole("alertdialog", { name: "Delete this photo?" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
});

test("PHOTO-01 play=0 opens the slideshow paused", async () => {
  await store.db.photos.bulkPut([synced(COAST)]);

  renderPhotos({ play: "0" });

  expect(await screen.findByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
});
