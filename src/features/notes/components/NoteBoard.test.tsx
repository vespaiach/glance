import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BoardNote } from "@/domain/notes";
import type { AccountSettings, Note } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import type { ZoneState } from "@/domain/zoneState";
import { NoteBoard } from "./NoteBoard";

const tz = deviceTimeZone();

const NOW = new Date(2026, 9, 9, 10, 41);

const NEWEST: Note = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  text: "Back at 6",
  author: "Mom",
  createdAt: new Date(2026, 9, 9, 10, 39).toISOString(),
  tone: 2,
  rotation: 1.5,
};

const WIFI: Note = {
  id: "0195f0a0-0000-7000-8000-000000000002",
  text: "Wi-Fi password is on the fridge!",
  author: "Dad",
  createdAt: new Date(2026, 9, 9, 8, 12).toISOString(),
  tone: 1,
  rotation: -2,
};

type Options = {
  state?: ZoneState<BoardNote>;
  expiry?: AccountSettings["noteExpiry"];
  onOpenNote?: (id: string) => void;
  onAddNote?: () => void;
};

function renderBoard(options: Options = {}) {
  return render(
    <NoteBoard
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      state={options.state ?? { kind: "ready", data: [NEWEST, WIFI] }}
      expiry={options.expiry === undefined ? "1w" : options.expiry}
      now={NOW}
      clock="12h"
      onOpenNote={options.onOpenNote ?? (() => {})}
      onAddNote={options.onAddNote ?? (() => {})}
    />,
  );
}

test("NOTE-06 the count reads {n} notes over the Notice board title", () => {
  renderBoard();

  expect(screen.getByText("2 notes")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Notice board" })).toBeInTheDocument();
});

test("NOTE-06 one note reads 1 note", () => {
  renderBoard({ state: { kind: "ready", data: [WIFI] } });

  expect(screen.getByText("1 note")).toBeInTheDocument();
});

test("NOTE-06 an empty board reads No notes", () => {
  renderBoard({ state: { kind: "empty" } });

  expect(screen.getByText("No notes")).toBeInTheDocument();
});

test("NOTE-04 notes show in the given order with their author and stamp", () => {
  renderBoard();

  const notes = screen.getAllByRole("button", { name: /Back at 6|Wi-Fi/ });

  expect(notes.map((note) => note.textContent)).toEqual([
    "Back at 6MomJust now",
    "Wi-Fi password is on the fridge!Dad8:12 AM",
  ]);
});

test("OFF-04 a new note waiting to post says so instead of its stamp", () => {
  renderBoard({ state: { kind: "ready", data: [{ ...NEWEST, waiting: true }, WIFI] } });

  expect(screen.getByText("Waiting to post")).toBeInTheDocument();
  expect(screen.queryByText("Just now")).not.toBeInTheDocument();
  expect(screen.getByText("8:12 AM")).toBeInTheDocument();
});

test("NOTE-06 the caption names the expiry setting", () => {
  const { rerender } = renderBoard({ expiry: "1d" });

  expect(
    screen.getByText("Select a note to edit or delete it · Notes are removed after 1 day"),
  ).toBeInTheDocument();

  rerender(
    <NoteBoard
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      state={{ kind: "ready", data: [WIFI] }}
      expiry={null}
      now={NOW}
      clock="12h"
      onOpenNote={() => {}}
      onAddNote={() => {}}
    />,
  );

  expect(
    screen.getByText("Select a note to edit or delete it · Notes stay until deleted"),
  ).toBeInTheDocument();
});

test("NOTE-07 the empty board invites a note and says how long notes stay", () => {
  renderBoard({ state: { kind: "empty" }, expiry: "1w" });

  expect(screen.getByText("No notes yet")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Leave a note for the family. Notes show on Today. They’re removed after 1 week.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Select a note/)).not.toBeInTheDocument();
});

test("NOTE-07 with expiry off the empty board says notes stay", () => {
  renderBoard({ state: { kind: "empty" }, expiry: null });

  expect(
    screen.getByText(
      "Leave a note for the family. Notes show on Today. They stay until someone deletes them.",
    ),
  ).toBeInTheDocument();
});

test("NOTE-01 Add note and tapping a note open the sheets", async () => {
  const onAddNote = vi.fn();
  const onOpenNote = vi.fn();

  renderBoard({ onAddNote, onOpenNote });

  await userEvent.click(screen.getByRole("button", { name: "Add note" }));
  await userEvent.click(screen.getByRole("button", { name: /Wi-Fi/ }));

  expect(onAddNote).toHaveBeenCalledOnce();
  expect(onOpenNote).toHaveBeenCalledWith(WIFI.id);
});

test("LOAD-01 while loading the board shows a notes skeleton", () => {
  renderBoard({ state: { kind: "loading" } });

  expect(screen.getByRole("status", { name: "Loading notes" })).toBeInTheDocument();
  expect(screen.getByText("Loading")).toBeInTheDocument();
});

test("FAIL-01 a failed board says notes are unavailable", () => {
  renderBoard({ state: { kind: "failed" } });

  expect(screen.getByText("Notes unavailable")).toBeInTheDocument();
});
