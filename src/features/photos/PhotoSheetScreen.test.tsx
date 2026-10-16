import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, putSyncStatus, synced } from "@/data/repos/testHarness";
import type { Photo } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { shellWrapper } from "@/shell/providers/testShell";
import { TimeZoneProvider } from "@/shell/providers/timeZone";
import { SheetHost, type SheetRequest, useSheetHost } from "@/shell/SheetHost";
import { PhotoSheetScreen } from "./PhotoSheetScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/photos" }));

const NOW = new Date("2026-10-09T17:41:00.000Z");

const HALLOWEEN: Photo = {
  id: "0192f3a0-1111-7000-8000-000000000008",
  title: "Halloween costumes",
  takenOn: "2025-10-31",
  createdAt: "2026-10-09T17:31:00.000Z",
  sources: { title: "file-name", takenOn: "file-name", place: "none" },
  checked: false,
  fileName: "halloween-costumes-2025-10-31.jpg",
};

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-photo-sheet-test");
});

afterEach(async () => {
  cleanup();

  await store.close();
});

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

function renderSheet(initial: SheetRequest) {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <TimeZoneProvider timeZone="America/Los_Angeles">
        <NetworkProvider>
          <SheetHost initial={initial}>{children}</SheetHost>
        </NetworkProvider>
      </TimeZoneProvider>
    </Shell>
  );

  return render(
    <>
      <PhotoSheetScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

test("PHOTO-12 a photo request opens Photo details with the photo, its values and today as the latest date", async () => {
  await store.db.photos.put(synced(HALLOWEEN));

  renderSheet({ kind: "photo", id: HALLOWEEN.id });

  expect(await screen.findByRole("dialog", { name: "Photo details" })).toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveValue("Halloween costumes");
  expect(screen.getByLabelText("Date taken")).toHaveAttribute("max", "2026-10-09");
  expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute(
    "src",
    `/photos/${HALLOWEEN.id}/display`,
  );
});

test("§8.9 a request with discard opens on Discard changes?", async () => {
  await store.db.photos.put(synced(HALLOWEEN));

  renderSheet({ kind: "photo", id: HALLOWEEN.id, discard: true });

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your edits to this photo won’t be saved.",
  );
});

test("PHOTO-12 Save queues the edited photo, checked, and closes the sheet", async () => {
  await store.db.photos.put(synced(HALLOWEEN, 3));

  renderSheet({ kind: "photo", id: HALLOWEEN.id });

  await userEvent.type(await screen.findByLabelText("Place"), "Portland, OR");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent("");
  await waitFor(async () =>
    expect(await store.db.photos.get(HALLOWEEN.id)).toEqual({
      ...synced(HALLOWEEN, 3),
      place: "Portland, OR",
      sources: { ...HALLOWEEN.sources, place: "edited" },
      checked: true,
    }),
  );
  expect(await store.db.outbox.count()).toBe(1);
});

test("PHOTO-12 offline the sheet saves for later", async () => {
  await store.db.photos.put(synced(HALLOWEEN));
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderSheet({ kind: "photo", id: HALLOWEEN.id });

  expect(await screen.findByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("PHOTO-13 Delete photo removes the photo and closes the sheet", async () => {
  await store.db.photos.put(synced(HALLOWEEN));

  renderSheet({ kind: "photo", id: HALLOWEEN.id });

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete photo" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent("");
  await waitFor(async () =>
    expect((await store.db.photos.get(HALLOWEEN.id))?.deletedAt).toBeDefined(),
  );
});

test("PHOTO-13 a photo deleted on another screen opens no sheet", async () => {
  await store.db.photos.put({ ...synced(HALLOWEEN), deletedAt: NOW.toISOString() });

  renderSheet({ kind: "photo", id: HALLOWEEN.id });

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("tech§4.3 a note request renders no photo sheet", () => {
  renderSheet({ kind: "newnote" });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
