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
      eyebrow={mode === "new" ? "Notice board" : "Dad · 8:12 AM"}
      initial={
        options.initial ?? initialNoteSheet(mode === "new" ? newNoteDraft() : draftFromNote(WIFI))
      }
      offline={options.offline ?? false}
      onClose={options.onClose ?? (() => {})}
      onDelete={options.onDelete ?? (() => {})}
      onSave={options.onSave ?? (() => {})}
      time="8:12 AM"
      rotation={-2}
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

test("D27 a note has one paper tone, so the sheet has no color picker", () => {
  renderSheet();

  expect(screen.queryByRole("group", { name: "Color" })).not.toBeInTheDocument();
});

test("NOTE-02 the message takes at most 280 characters and the name 32", () => {
  renderSheet();

  expect(screen.getByLabelText("Message")).toHaveAttribute("maxlength", "280");
  expect(screen.getByLabelText("Your name")).toHaveAttribute("maxlength", "32");
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

  await userEvent.type(screen.getByLabelText("Your name"), "dy");
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

test("A11Y-04 Tab moves through Close, Message, Your name, then the actions, and wraps", async () => {
  renderSheet();

  expect(await tabOrder(7)).toEqual([
    screen.getByRole("button", { name: "Close" }),
    screen.getByLabelText("Message"),
    screen.getByLabelText("Your name"),
    screen.getByRole("button", { name: "Delete" }),
    screen.getByRole("button", { name: "Cancel" }),
    screen.getByRole("button", { name: "Save" }),
    screen.getByRole("button", { name: "Close" }),
  ]);
});

test("§8.9 Cancel on a changed note asks Discard changes? and says it won’t be posted", async () => {
  const onClose = vi.fn();
  renderSheet({ onClose });

  await userEvent.type(screen.getByLabelText("Your name"), "dy");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("alert")).toHaveTextContent("Discard changes?This note won’t be posted.");
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
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

test("NOTE-10 a tapped note opens Note details: From its author on the Notice board", () => {
  renderDetails();

  const dialog = screen.getByRole("dialog", { name: "From Dad" });

  expect(within(dialog).getByText("Notice board")).toBeInTheDocument();
  expect(within(dialog).getByText("Wi-Fi password is on the fridge!")).toBeInTheDocument();
  expect(within(dialog).getByText("8:12 AM")).toBeInTheDocument();
});

test("NOTE-10 a note with a blank author is From Guest", () => {
  renderDetails({ initial: initialNoteSheet({ ...WIFI, author: " " }, { details: true }) });

  expect(screen.getByRole("dialog", { name: "From Guest" })).toBeInTheDocument();
});

test("NOTE-10 Note details are read-only with a single Edit, no color picker and no offline banner", () => {
  renderDetails({ offline: true });

  expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["", "Edit"]);
  expect(screen.queryByRole("group", { name: "Color" })).not.toBeInTheDocument();
  expect(screen.queryByText("You’re offline")).not.toBeInTheDocument();
});

test("NOTE-10 Edit turns the sheet into Edit note, and Cancel with no change returns to details", async () => {
  const onClose = vi.fn();

  renderDetails({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(screen.getByRole("dialog", { name: "Edit note" })).toBeInTheDocument();
  expect(screen.getByText("Dad · 8:12 AM")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("dialog", { name: "From Dad" })).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("NOTE-10 Cancel after a change asks Discard changes?, and Discard returns to details unchanged", async () => {
  const onClose = vi.fn();

  renderDetails({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  await userEvent.type(screen.getByLabelText("Message"), " Ask Mom.");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("alert")).toHaveTextContent("Discard changes?");

  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(screen.getByRole("dialog", { name: "From Dad" })).toBeInTheDocument();
  expect(screen.getByText("Wi-Fi password is on the fridge!")).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("NOTE-10 the close button after a change asks, and Discard closes the sheet", async () => {
  const onClose = vi.fn();

  renderDetails({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  await userEvent.type(screen.getByLabelText("Message"), "!");
  await userEvent.click(screen.getByRole("button", { name: "Close" }));
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
  expect(screen.getByRole("dialog", { name: "From Dad" })).toBeInTheDocument();
  expect(
    screen.getByText((_, element) => element?.textContent === "Back at 6\nDinner in the oven"),
  ).toBeInTheDocument();
});

test("NOTE-10 Delete from an edit opened in details deletes", async () => {
  const onDelete = vi.fn();

  renderDetails({ onDelete });

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete note" }));

  expect(onDelete).toHaveBeenCalledOnce();
});
