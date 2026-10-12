import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { draftFromNote, initialNoteSheet, newNoteDraft, noteSwatches } from "../noteSheet";
import { NoteSheet } from "./NoteSheet";

const WIFI = { text: "Wi-Fi password is on the fridge!", author: "Dad", tone: 1 } as const;

type Options = {
  mode?: "new" | "edit";
  offline?: boolean;
  onClose?: () => void;
  onDelete?: () => void;
};

function renderSheet(options: Options = {}) {
  const mode = options.mode ?? "edit";

  return render(
    <NoteSheet
      mode={mode}
      eyebrow={mode === "new" ? "Notice board" : "Dad · 8:12 AM"}
      initial={initialNoteSheet(mode === "new" ? newNoteDraft() : draftFromNote(WIFI))}
      swatches={noteSwatches("fall")}
      offline={options.offline ?? false}
      onClose={options.onClose ?? (() => {})}
      onDelete={options.onDelete ?? (() => {})}
    />,
  );
}

test("NOTE-01 a new note sheet is titled New note under the Notice board eyebrow", () => {
  renderSheet({ mode: "new" });

  const dialog = screen.getByRole("dialog", { name: "New note" });

  expect(within(dialog).getByText("Notice board")).toBeInTheDocument();
});

test("NOTE-01 an existing note opens as Edit note under its author and time", () => {
  renderSheet();

  const dialog = screen.getByRole("dialog", { name: "Edit note" });

  expect(within(dialog).getByText("Dad · 8:12 AM")).toBeInTheDocument();
});

test("NOTE-02 Message is a 3-row multiline field with the family placeholder", () => {
  renderSheet();

  const message = screen.getByLabelText("Message");

  expect(message.tagName).toBe("TEXTAREA");
  expect(message).toHaveAttribute("rows", "3");
  expect(message).toHaveAttribute("placeholder", "Leave a note for the family");
  expect(message).toHaveValue("Wi-Fi password is on the fridge!");
});

test("NOTE-02 Your name is optional and shows the author", () => {
  renderSheet();

  const name = screen.getByLabelText("Your name");

  expect(name).toHaveAttribute("placeholder", "Optional");
  expect(name).toHaveValue("Dad");
});

test("NOTE-02 Color offers the five season swatches and no Alert", async () => {
  renderSheet();

  const color = screen.getByRole("group", { name: "Color" });

  expect(within(color).getAllByRole("button")).toHaveLength(5);
  expect(within(color).queryByRole("button", { name: "Alert" })).not.toBeInTheDocument();
  expect(within(color).getByRole("button", { name: "Amber" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await userEvent.click(within(color).getByRole("button", { name: "Sage" }));

  expect(within(color).getByRole("button", { name: "Sage" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("NOTE-02 typing edits the message and name", async () => {
  renderSheet({ mode: "new" });

  await userEvent.type(screen.getByLabelText("Message"), "Back at 6");
  await userEvent.type(screen.getByLabelText("Your name"), "Mom");

  expect(screen.getByLabelText("Message")).toHaveValue("Back at 6");
  expect(screen.getByLabelText("Your name")).toHaveValue("Mom");
});

test("NOTE-05 a new note posts with Post note and has no Delete", () => {
  renderSheet({ mode: "new" });

  expect(screen.getByRole("button", { name: "Post note" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
});

test("NOTE-05 an existing note saves with Save", () => {
  renderSheet();

  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("NOTE-05 offline the sheet shows the note banner and Save for later", () => {
  renderSheet({ mode: "new", offline: true });

  expect(screen.getByText("You’re offline")).toBeInTheDocument();
  expect(
    screen.getByText("The note saves on this screen and posts when the connection is back."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("NOTE-05 Delete turns into Delete note, which deletes", async () => {
  const onDelete = vi.fn();

  renderSheet({ onDelete });

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(onDelete).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Delete note" }));

  expect(onDelete).toHaveBeenCalledOnce();
});

test("SHEET Cancel closes the sheet", async () => {
  const onClose = vi.fn();

  renderSheet({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledOnce();
});
