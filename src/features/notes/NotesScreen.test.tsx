import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  synced,
} from "@/data/repos/testHarness";
import type { AccountSettings, Note } from "@/domain/schemas";
import { shellWrapper } from "@/shell/providers/testShell";
import { SheetHost, useSheetHost } from "@/shell/SheetHost";
import { NotesScreen } from "./NotesScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/notes" }));

const NOW = new Date(2026, 9, 9, 10, 41);

const WIFI: Note = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  text: "Wi-Fi password is on the fridge!",
  author: "Dad",
  createdAt: new Date(2026, 9, 9, 8, 12).toISOString(),
  tone: 1,
  rotation: -2,
};

const PACKAGE: Note = {
  id: "0195f0a0-0000-7000-8000-000000000002",
  text: "Package for Mia at the front door.",
  author: "Mom",
  createdAt: new Date(2026, 9, 9, 9, 5).toISOString(),
  tone: 2,
  rotation: 1.5,
};

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-notes-screen-test");
});

afterEach(async () => {
  cleanup();

  await store.close();
});

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

function renderNotes(overrides: Partial<AccountSettings> = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW, overrides });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SheetHost>{children}</SheetHost>
    </Shell>
  );

  return render(
    <>
      <NotesScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

test("NOTE-04 the board lists the saved notes newest first", async () => {
  await store.db.notes.bulkPut([synced(WIFI), synced(PACKAGE)]);

  renderNotes();

  expect(await screen.findByText("2 notes")).toBeInTheDocument();
  expect(
    screen.getAllByRole("button", { name: /Dad|Mom/ }).map((note) => note.textContent),
  ).toEqual([
    "Package for Mia at the front door.Mom9:05 AM",
    "Wi-Fi password is on the fridge!Dad8:12 AM",
  ]);
});

test("NOTE-06 the caption follows the note expiry setting", async () => {
  await store.db.notes.put(synced(WIFI));

  renderNotes({ noteExpiry: { on: true, days: 1 } });

  expect(
    await screen.findByText("Select a note to edit or delete it · Notes are removed after 1 day"),
  ).toBeInTheDocument();
});

test("NOTE-07 with no notes the board shows the empty state", async () => {
  await markSynced(store);

  renderNotes({ noteExpiry: { on: false, days: 7 } });

  expect(await screen.findByText("No notes yet")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Leave a note for the family. Notes show on Today. They stay until someone deletes them.",
    ),
  ).toBeInTheDocument();
});

test("NOTE-01 tapping a note opens Note details for it", async () => {
  await store.db.notes.put(synced(WIFI));

  renderNotes();

  await userEvent.click(await screen.findByRole("button", { name: /Wi-Fi/ }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "note", id: WIFI.id }),
  );
});

test("NOTE-01 Add note opens New note", async () => {
  renderNotes();

  await userEvent.click(await screen.findByRole("button", { name: "Add note" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent(
    JSON.stringify({ kind: "newnote" }),
  );
});

test("FAIL-01 a failed first sync shows Notes unavailable with a countdown and Try again", async () => {
  await putSyncStatus(store, {
    online: true,
    error: "server",
    retryAt: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    weather: { state: "idle" },
  });

  renderNotes();

  expect(await screen.findByText("Notes unavailable")).toBeInTheDocument();
  expect(
    screen.getByText("The Glance server isn’t responding. Trying again in 5 min."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(store.nudge).toHaveBeenCalledTimes(1);
});
