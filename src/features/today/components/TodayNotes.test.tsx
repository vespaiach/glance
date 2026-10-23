import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BoardNote } from "@/domain/notes";
import type { Note } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import type { ZoneState } from "@/domain/zoneState";
import { TodayNotes } from "./TodayNotes";

const tz = deviceTimeZone();

const at = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).toISOString();

const NOTES: Note[] = [
  {
    id: "package",
    text: "Package for Mia at the front door.",
    author: "Mom",
    createdAt: at(9, 9, 5),
    rotation: 1.5,
  },
  {
    id: "wifi",
    text: "Wi-Fi password is on the fridge!",
    author: "Dad",
    createdAt: at(9, 8, 12),
    rotation: -2,
  },
  {
    id: "grandpa",
    text: "Welcome home, Grandpa!",
    author: "Mia",
    createdAt: at(6, 16, 45),
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
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      state={state}
      now={new Date(2026, 9, 9, 10, 41)}
      clock="12h"
      breakpoint="small"
      onOpenNote={handlers.onOpenNote ?? (() => {})}
      onAddNote={handlers.onAddNote ?? (() => {})}
      onOpenNotes={handlers.onOpenNotes ?? (() => {})}
    />,
  );
}

const ready = { kind: "ready", data: NOTES } as const;

const two = { kind: "ready", data: NOTES.slice(0, 2) } as const;

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

test("TODAY-09 each note is a button named by its author and text", () => {
  const [first, second] = NOTES as [Note, Note];

  renderNotes({ kind: "ready", data: [first, { ...second, author: "" }] });

  expect(
    screen.getByRole("button", { name: "Note from Mom: Package for Mia at the front door." }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Note: Wi-Fi password is on the fridge!" }),
  ).toBeInTheDocument();
});

test("TODAY-09 tapping a note opens it", async () => {
  const onOpenNote = vi.fn<(id: string) => void>();

  renderNotes(ready, { onOpenNote });

  await userEvent.click(screen.getByRole("button", { name: /Wi-Fi password/ }));

  expect(onOpenNote).toHaveBeenCalledWith("wifi");
});

test("TODAY-09 notes not shown are a more row that opens Notes", async () => {
  const onOpenNotes = vi.fn<() => void>();

  renderNotes(ready, { onOpenNotes });

  expect(screen.getByText("1 more note")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "1 more note, open Notes" }));

  expect(onOpenNotes).toHaveBeenCalledTimes(1);
});

test("TODAY-09 the more row counts every note not shown", () => {
  const extra = { ...NOTES[2], id: "extra", text: "Recycling goes out tonight." } as Note;

  renderNotes({ kind: "ready", data: [...NOTES, extra] });

  expect(screen.getByRole("button", { name: "2 more notes, open Notes" })).toBeInTheDocument();
});

test("TODAY-09 with every note shown there is no more row and All notes goes to Notes", async () => {
  const onOpenNotes = vi.fn<() => void>();

  renderNotes(two, { onOpenNotes });

  expect(screen.queryByRole("button", { name: /more note/ })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "All notes" }));

  expect(onOpenNotes).toHaveBeenCalledTimes(1);
});

test("TODAY-09 with notes hidden the header has no All notes", () => {
  renderNotes(ready);

  expect(screen.queryByRole("button", { name: "All notes" })).not.toBeInTheDocument();
});

test("TODAY-09 Add note in the header opens a new note", async () => {
  const onAddNote = vi.fn<() => void>();

  renderNotes(ready, { onAddNote });

  await userEvent.click(screen.getByRole("button", { name: "Add note" }));

  expect(onAddNote).toHaveBeenCalledTimes(1);
});

test("TODAY-09 with no notes the whole card is one button that opens a new note", async () => {
  const onAddNote = vi.fn<() => void>();

  renderNotes({ kind: "empty" }, { onAddNote });

  expect(screen.getByText("Notes")).toBeInTheDocument();
  expect(screen.getByText("Something to share at home?")).toBeInTheDocument();
  expect(
    screen.getByText("Milk in the fridge, flowers to water. Leave a note for the family."),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("button")).toHaveLength(1);

  await userEvent.click(screen.getByRole("button", { name: "Add the first note" }));

  expect(onAddNote).toHaveBeenCalledTimes(1);
});

test("LOAD-02 notes still loading show tiles and only Add note in the header", () => {
  renderNotes({ kind: "loading" });

  expect(screen.getByRole("status", { name: "Loading notes" })).toBeInTheDocument();
  expect(screen.getByText("Notes")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add note" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "All notes" })).not.toBeInTheDocument();
});
