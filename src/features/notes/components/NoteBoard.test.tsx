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
  rotation: 1.5,
};

const WIFI: Note = {
  id: "0195f0a0-0000-7000-8000-000000000002",
  text: "Wi-Fi password is on the fridge!",
  author: "Dad",
  createdAt: new Date(2026, 9, 9, 8, 12).toISOString(),
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
      expiry={options.expiry ?? { on: true, days: 7 }}
      now={NOW}
      clock="12h"
      breakpoint="large"
      onOpenNote={options.onOpenNote ?? (() => {})}
      onAddNote={options.onAddNote ?? (() => {})}
    />,
  );
}

test("NOTE-06 the count reads {n} notes with the expiry over the Notice board title", () => {
  renderBoard();

  expect(screen.getByText("2 notes · cleared after 7 days")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Notice board" })).toBeInTheDocument();
});

test("NOTE-06 one note cleared after one day reads 1 note · cleared after 1 day", () => {
  renderBoard({ state: { kind: "ready", data: [WIFI] }, expiry: { on: true, days: 1 } });

  expect(screen.getByText("1 note · cleared after 1 day")).toBeInTheDocument();
});

test("NOTE-06 with expiry off the count says notes are kept until deleted", () => {
  renderBoard({ expiry: { on: false, days: 7 } });

  expect(screen.getByText("2 notes · kept until deleted")).toBeInTheDocument();
});

test("NOTE-06 an empty board reads No notes", () => {
  renderBoard({ state: { kind: "empty" } });

  expect(screen.getByText("No notes")).toBeInTheDocument();
});

test("NOTE-04 notes show in the given order with their author and stamp", () => {
  renderBoard();

  const notes = screen.getAllByRole("button", { name: /^Note/ });

  expect(notes.map((note) => note.textContent)).toEqual([
    "Back at 6MomJust now",
    "Wi-Fi password is on the fridge!Dad8:12 AM",
  ]);
});

test("NOTE-01 each board note is a button named with its author, time and full text", () => {
  renderBoard();

  expect(
    screen.getByRole("button", {
      name: "Note from Dad, 8:12 AM: Wi-Fi password is on the fridge!",
    }),
  ).toBeInTheDocument();
});

test("NOTE-03 an unsigned board note is named with its time only", () => {
  renderBoard({ state: { kind: "ready", data: [{ ...WIFI, author: "" }] } });

  expect(
    screen.getByRole("button", { name: "Note, 8:12 AM: Wi-Fi password is on the fridge!" }),
  ).toBeInTheDocument();
});

test("NOTE-01 a long note shows its first 120 characters cut at a word", () => {
  const text = `${"a".repeat(110)} bcdefghijk lmnop`;

  renderBoard({ state: { kind: "ready", data: [{ ...WIFI, text }] } });

  const note = screen.getByRole("button", { name: `Note from Dad, 8:12 AM: ${text}` });

  expect(note).toHaveTextContent(`${"a".repeat(110)}…`);
  expect(note).not.toHaveTextContent("bcdefghijk");
});

test("OFF-04 a new note waiting to post says so instead of its stamp", () => {
  renderBoard({ state: { kind: "ready", data: [{ ...NEWEST, waiting: true }, WIFI] } });

  expect(screen.getByText("Waiting to post")).toBeInTheDocument();
  expect(screen.queryByText("Just now")).not.toBeInTheDocument();
  expect(screen.getByText("8:12 AM")).toBeInTheDocument();
});

test("NOTE-06 there is no caption under the board", () => {
  renderBoard();

  expect(screen.queryByText(/Select a note/)).not.toBeInTheDocument();
});

test("NOTE-07 the empty board invites a note", () => {
  renderBoard({ state: { kind: "empty" }, expiry: { on: true, days: 7 } });

  expect(screen.getByText("Something to share at home?")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Fresh milk in the fridge, flowers to water, a pickup at 5. Tap the pad and leave a note for the family.",
    ),
  ).toBeInTheDocument();
});

test("NOTE-07 tapping the pad on the empty board opens New note", async () => {
  const onAddNote = vi.fn<() => void>();

  renderBoard({ state: { kind: "empty" }, onAddNote });

  await userEvent.click(screen.getByRole("button", { name: "Add the first note" }));

  expect(onAddNote).toHaveBeenCalledOnce();
});

test("NOTE-01 Add note and tapping a note open the sheets", async () => {
  const onAddNote = vi.fn();
  const onOpenNote = vi.fn();

  renderBoard({ onAddNote, onOpenNote });

  await userEvent.click(screen.getByRole("button", { name: "Add note" }));
  await userEvent.click(screen.getByRole("button", { name: /^Note from Dad/ }));

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
