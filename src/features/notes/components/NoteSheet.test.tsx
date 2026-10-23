import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  draftFromNote,
  initialNoteSheet,
  type NoteDraft,
  type NoteSheetState,
  newNoteDraft,
} from "../noteSheet";
import { NoteSheet } from "./NoteSheet";

const WIFI = { text: "Wi-Fi password is on the fridge!", author: "Dad" } as const;

type Options = {
  mode?: "new" | "edit";
  offline?: boolean;
  initial?: NoteSheetState;
  onClose?: () => void;
  onDelete?: () => void;
  onSave?: (draft: NoteDraft) => void;
};

function renderSheet(options: Options = {}) {
  const mode = options.mode ?? "edit";

  return render(
    <NoteSheet
      mode={mode}
      initial={
        options.initial ?? initialNoteSheet(mode === "new" ? newNoteDraft() : draftFromNote(WIFI))
      }
      offline={options.offline ?? false}
      breakpoint="large"
      onClose={options.onClose ?? (() => {})}
      onDelete={options.onDelete ?? (() => {})}
      onSave={options.onSave ?? (() => {})}
      time="8:12 AM"
    />,
  );
}

test("NOTE-02 a new note sheet is named New note with a New note eyebrow and no visible title", () => {
  renderSheet({ mode: "new" });

  const dialog = screen.getByRole("dialog", { name: "New note" });

  expect(
    within(dialog)
      .getAllByText("New note")
      .map((node) => node.tagName),
  ).toEqual(["DIV", "H2"]);
});

test("NOTE-02 an existing note opens as Edit note with its author and time in the footer", () => {
  renderSheet();

  const dialog = screen.getByRole("dialog", { name: "Edit note" });

  expect(within(dialog).getByText("Dad · 8:12 AM")).toBeInTheDocument();
});

test("NOTE-02 the message is a one-line textarea on the paper, focused on open", () => {
  renderSheet({ mode: "new" });

  const message = screen.getByRole("textbox", { name: "Message" });

  expect(message.tagName).toBe("TEXTAREA");
  expect(message).toHaveAttribute("rows", "1");
  expect(message).toHaveAttribute("placeholder", "Leave a note for the family");
  expect(message).toHaveFocus();
});

test("NOTE-02 From shows the author with the Your name placeholder", () => {
  renderSheet();

  const from = screen.getByLabelText("From");

  expect(from).toHaveAttribute("placeholder", "Your name");
  expect(from).toHaveValue("Dad");
});

test("D27 a note has one paper tone, so the sheet has no color picker", () => {
  renderSheet();

  expect(screen.queryByRole("group", { name: "Color" })).not.toBeInTheDocument();
});

test("NOTE-02 the message takes at most 280 characters and the name 32", () => {
  renderSheet();

  expect(screen.getByLabelText("Message")).toHaveAttribute("maxlength", "280");
  expect(screen.getByLabelText("From")).toHaveAttribute("maxlength", "32");
});

test("NOTE-02 typing edits the message and name", async () => {
  renderSheet({ mode: "new" });

  await userEvent.type(screen.getByLabelText("Message"), "Back at 6");
  await userEvent.type(screen.getByLabelText("From"), "Mom");

  expect(screen.getByLabelText("Message")).toHaveValue("Back at 6");
  expect(screen.getByLabelText("From")).toHaveValue("Mom");
});

test("NOTE-05 a new note has only Close and Post note: no Cancel and no Delete", () => {
  renderSheet({ mode: "new" });

  expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
    "",
    "Post note",
  ]);
});

test("NOTE-05 an existing note saves with Save and has no Cancel", () => {
  renderSheet();

  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
});

test("NOTE-05 offline the sheet shows the note banner and Save for later", () => {
  renderSheet({ mode: "new", offline: true });

  expect(screen.getByText("You’re offline")).toBeInTheDocument();
  expect(
    screen.getByText("The note saves on this screen and posts when the connection is back."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("NOTE-05 Board shows the first 120 appears only past 120 characters", async () => {
  renderSheet({
    mode: "new",
    initial: initialNoteSheet(newNoteDraft({ text: "a".repeat(120) })),
  });

  expect(screen.queryByText("Board shows the first 120")).not.toBeInTheDocument();

  await userEvent.type(screen.getByLabelText("Message"), "b");

  expect(screen.getByText("Board shows the first 120")).toBeInTheDocument();
});

test("NOTE-05 the close button on an unchanged note closes at once", async () => {
  const onClose = vi.fn();

  renderSheet({ mode: "new", onClose });

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalledOnce();
});

test("NOTE-05 the close button on a written note asks Discard changes?, and Discard closes", async () => {
  const onClose = vi.fn();

  renderSheet({ mode: "new", onClose });

  await userEvent.type(screen.getByLabelText("Message"), "Back at 6");
  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(screen.getByRole("alert")).toHaveTextContent("Discard changes?This note won’t be posted.");
  expect(onClose).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalledOnce();
});

test("NOTE-03 Post note with an empty message shows Write a message and posts nothing", async () => {
  const onSave = vi.fn();

  renderSheet({ mode: "new", onSave });

  await userEvent.click(screen.getByRole("button", { name: "Post note" }));

  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Message")).toHaveAccessibleDescription("Write a message");
});

test("NOTE-05 Save hands the edited draft over", async () => {
  const onSave = vi.fn();

  renderSheet({ onSave });

  await userEvent.type(screen.getByLabelText("From"), "dy");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledWith({ ...WIFI, author: "Daddy" });
});

async function tabOrder(count: number) {
  const visited: Element[] = [];

  for (let step = 0; step < count; step += 1) {
    await userEvent.tab();
    visited.push(document.activeElement as Element);
  }

  return visited;
}

test("A11Y-04 Tab moves from the message through From, Save and Close, and wraps", async () => {
  renderSheet();

  expect(await tabOrder(4)).toEqual([
    screen.getByLabelText("From"),
    screen.getByRole("button", { name: "Save" }),
    screen.getByRole("button", { name: "Close" }),
    screen.getByLabelText("Message"),
  ]);
});

test("§8.9 a new note opened with text asks on the scrim, ignores it while asking, and Discard closes", async () => {
  const onClose = vi.fn();
  const typed = initialNoteSheet(newNoteDraft({ text: "Has anyone seen" }), {
    opened: newNoteDraft(),
  });
  renderSheet({ mode: "new", initial: typed, onClose });

  const scrim = screen.getByRole("dialog").previousElementSibling as HTMLElement;

  await userEvent.click(scrim);
  await userEvent.click(scrim);

  expect(onClose).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalledOnce();
});

test("§8.9 typing while it asks brings the normal footer back", async () => {
  renderSheet({ initial: initialNoteSheet(draftFromNote(WIFI), { discard: true }) });

  await userEvent.type(screen.getByLabelText("Message"), "!");

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

function renderDetails(options: Options = {}) {
  return renderSheet({
    initial: initialNoteSheet(draftFromNote(WIFI), { details: true }),
    ...options,
  });
}

test("NOTE-10 a tapped note opens Note details named Note from its author under {author} · {time}", () => {
  renderDetails();

  const dialog = screen.getByRole("dialog", { name: "Note from Dad" });

  expect(within(dialog).getByText("Dad · 8:12 AM")).toBeInTheDocument();
  expect(within(dialog).getByText("Wi-Fi password is on the fridge!")).toBeInTheDocument();
});

test("NOTE-10 an unsigned note's details show the time alone", () => {
  renderDetails({ initial: initialNoteSheet({ ...WIFI, author: " " }, { details: true }) });

  const dialog = screen.getByRole("dialog", { name: "Note" });

  expect(within(dialog).getByText("8:12 AM")).toBeInTheDocument();
});

test("NOTE-10 Note details are read-only with Delete and Edit, no color picker and no offline banner", () => {
  renderDetails({ offline: true });

  expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
    "",
    "Delete",
    "Edit",
  ]);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByText("You’re offline")).not.toBeInTheDocument();
});

test("NOTE-10 Delete in details turns into Delete note inline, which deletes", async () => {
  const onDelete = vi.fn();

  renderDetails({ onDelete });

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Delete note" }));

  expect(onDelete).toHaveBeenCalledOnce();
});

test("NOTE-10 Edit turns the sheet into Edit note, and the close button with no change returns to details", async () => {
  const onClose = vi.fn();

  renderDetails({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(screen.getByRole("dialog", { name: "Edit note" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(screen.getByRole("dialog", { name: "Note from Dad" })).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("NOTE-10 the close button after a change asks Discard changes?, and Discard returns to details unchanged", async () => {
  const onClose = vi.fn();

  renderDetails({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  await userEvent.type(screen.getByLabelText("Message"), " Ask Mom.");
  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(screen.getByRole("alert")).toHaveTextContent("Discard changes?");

  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(screen.getByRole("dialog", { name: "Note from Dad" })).toBeInTheDocument();
  expect(screen.getByText("Wi-Fi password is on the fridge!")).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("NOTE-10 the scrim after a change asks, and Discard closes the sheet", async () => {
  const onClose = vi.fn();

  renderDetails({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  await userEvent.type(screen.getByLabelText("Message"), "!");
  await userEvent.click(screen.getByRole("dialog").previousElementSibling as HTMLElement);
  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalledOnce();
});

test("NOTE-10 Save from details hands the draft over and returns to details with the new text", async () => {
  const onSave = vi.fn();
  const onClose = vi.fn();

  renderDetails({ onSave, onClose });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  await userEvent.clear(screen.getByLabelText("Message"));
  await userEvent.type(screen.getByLabelText("Message"), "Back at 6{Enter}Dinner in the oven");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledWith({ ...WIFI, text: "Back at 6\nDinner in the oven" });
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog", { name: "Note from Dad" })).toBeInTheDocument();
  expect(
    screen.getByText("Back at 6\nDinner in the oven", { normalizer: (text) => text }),
  ).toBeInTheDocument();
});
