import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BoardNote } from "@/domain/notes";
import type { Note } from "@/domain/schemas";
import type { ZoneState } from "@/domain/zoneState";
import { TodayNotes } from "./TodayNotes";

const at = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).toISOString();

const NOTES: Note[] = [
  {
    id: "package",
    text: "Package for Mia at the front door.",
    author: "Mom",
    createdAt: at(9, 9, 5),
    tone: 2,
    rotation: 1.5,
  },
  {
    id: "wifi",
    text: "Wi-Fi password is on the fridge!",
    author: "Dad",
    createdAt: at(9, 8, 12),
    tone: 1,
    rotation: -2,
  },
  {
    id: "grandpa",
    text: "Welcome home, Grandpa!",
    author: "Mia",
    createdAt: at(6, 16, 45),
    tone: 4,
    rotation: 2.5,
  },
];

type Handlers = {
  onOpenNote: (id: string) => void;
  onAddNote: () => void;
  onOpenNotes: () => void;
};

function renderNotes(state: ZoneState<BoardNote>, handlers: Partial<Handlers> = {}) {
  return render(
    <TodayNotes
      retryIn={1}
      onRetry={() => {}}
      state={state}
      now={new Date(2026, 9, 9, 10, 41)}
      clock="12h"
      onOpenNote={handlers.onOpenNote ?? (() => {})}
      onAddNote={handlers.onAddNote ?? (() => {})}
      onOpenNotes={handlers.onOpenNotes ?? (() => {})}
    />,
  );
}

const ready = { kind: "ready", data: NOTES } as const;

test("TODAY-09 the eyebrow counts every note but only the first two show", () => {
  renderNotes(ready);

  expect(screen.getByText("Notes · 3")).toBeInTheDocument();
  expect(screen.getByText("Package for Mia at the front door.")).toBeInTheDocument();
  expect(screen.getByText("Wi-Fi password is on the fridge!")).toBeInTheDocument();
  expect(screen.queryByText("Welcome home, Grandpa!")).not.toBeInTheDocument();
});

test("NOTE-04 each note shows its author and stamp", () => {
  renderNotes(ready);

  expect(screen.getByText("Mom")).toBeInTheDocument();
  expect(screen.getByText("9:05 AM")).toBeInTheDocument();
});

test("OFF-04 a new note waiting to post says so instead of its stamp", () => {
  const [first, ...rest] = NOTES as [Note, ...Note[]];

  renderNotes({ kind: "ready", data: [{ ...first, waiting: true }, ...rest] });

  expect(screen.getByText("Waiting to post")).toBeInTheDocument();
  expect(screen.queryByText("9:05 AM")).not.toBeInTheDocument();
});

test("TODAY-09 tapping a note opens it", async () => {
  const onOpenNote = vi.fn<(id: string) => void>();

  renderNotes(ready, { onOpenNote });

  await userEvent.click(screen.getByRole("button", { name: /Wi-Fi password/ }));

  expect(onOpenNote).toHaveBeenCalledWith("wifi");
});

test("TODAY-09 All notes goes to Notes", async () => {
  const onOpenNotes = vi.fn<() => void>();

  renderNotes(ready, { onOpenNotes });

  await userEvent.click(screen.getByRole("button", { name: "All notes" }));

  expect(onOpenNotes).toHaveBeenCalledTimes(1);
});

test("TODAY-09 with no notes Add note opens a new note", async () => {
  const onAddNote = vi.fn<() => void>();

  renderNotes({ kind: "empty" }, { onAddNote });

  expect(screen.getByText("Notes · 0")).toBeInTheDocument();
  expect(screen.getByText("No notes yet")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Add note" }));

  expect(onAddNote).toHaveBeenCalledTimes(1);
});

test("LOAD-02 notes still loading show a skeleton", () => {
  renderNotes({ kind: "loading" });

  expect(screen.getByRole("status", { name: "Loading notes" })).toBeInTheDocument();
});
