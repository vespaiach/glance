import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, putSyncStatus, synced } from "@/data/repos/testHarness";
import type { AccountSettings, Note } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { SheetHost, type SheetRequest, useSheetHost } from "@/shell/SheetHost";
import { NoteSheetScreen } from "./NoteSheetScreen";

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

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-note-sheet-test");

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();

  await store.close();
});

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

function renderSheet(initial: SheetRequest, overrides: Partial<AccountSettings> = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW, overrides });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SeasonProvider>
        <NetworkProvider>
          <SheetHost initial={initial}>{children}</SheetHost>
        </NetworkProvider>
      </SeasonProvider>
    </Shell>
  );

  return render(
    <>
      <NoteSheetScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

test("NOTE-01 a note request opens Edit note under its author and time", async () => {
  await store.db.notes.put(synced(WIFI));

  renderSheet({ kind: "note", id: WIFI.id });

  expect(await screen.findByRole("dialog", { name: "Edit note" })).toBeInTheDocument();
  expect(screen.getByText("Dad · 8:12 AM")).toBeInTheDocument();
  expect(screen.getByLabelText("Message")).toHaveValue("Wi-Fi password is on the fridge!");
});

test("NOTE-04 the eyebrow time follows the Clock setting", async () => {
  await store.db.notes.put(synced(WIFI));

  renderSheet({ kind: "note", id: WIFI.id }, { clock: "24h" });

  expect(await screen.findByText("Dad · 08:12")).toBeInTheDocument();
});

test("NOTE-01 a new note request opens a blank New note on the Notice board", async () => {
  renderSheet({ kind: "newnote" });

  expect(await screen.findByRole("dialog", { name: "New note" })).toBeInTheDocument();
  expect(screen.getByText("Notice board")).toBeInTheDocument();
  expect(screen.getByLabelText("Message")).toHaveValue("");
});

test("tech§6 a new note request can carry the fixture draft", async () => {
  renderSheet({ kind: "newnote", draft: { text: "Has anyone seen my blue umbr", tone: 2 } });

  expect(await screen.findByLabelText("Message")).toHaveValue("Has anyone seen my blue umbr");
});

test("NOTE-05 offline the sheet saves for later", async () => {
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderSheet({ kind: "newnote" });

  expect(await screen.findByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("NOTE-05 Delete note removes the note and closes the sheet", async () => {
  await store.db.notes.put(synced(WIFI));

  renderSheet({ kind: "note", id: WIFI.id });

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete note" }));

  expect(screen.getByRole("status", { name: "Open sheet" })).toHaveTextContent("");
  await waitFor(async () => expect((await store.db.notes.get(WIFI.id))?.deletedAt).toBeDefined());
});

test("tech§4.3 an event request renders no note sheet", () => {
  renderSheet({ kind: "newevent", day: "2026-10-09" });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
