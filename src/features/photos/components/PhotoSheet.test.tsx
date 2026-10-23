import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Photo } from "@/domain/schemas";
import { draftFromPhoto, initialPhotoSheet, type PhotoSheetState } from "../photoSheet";
import { PhotoSheet } from "./PhotoSheet";

const HALLOWEEN: Photo = {
  id: "0192f3a0-1111-7000-8000-000000000008",
  title: "Halloween costumes",
  takenOn: "2025-10-31",
  createdAt: "2026-10-09T17:31:00.000Z",
  sources: { title: "file-name", takenOn: "file-name", place: "none" },
  checked: false,
  fileName: "halloween-costumes-2025-10-31.jpg",
};

type Options = {
  photo?: Photo;
  offline?: boolean;
  initial?: PhotoSheetState;
  onClose?: () => void;
  onDelete?: () => void;
  onSave?: (photo: Photo) => void;
};

function renderSheet(options: Options = {}) {
  const photo = options.photo ?? HALLOWEEN;

  return render(
    <PhotoSheet
      photo={photo}
      src="/photo.webp"
      today="2026-10-09"
      initial={options.initial ?? initialPhotoSheet(draftFromPhoto(photo))}
      offline={options.offline ?? false}
      onClose={options.onClose ?? (() => {})}
      onDelete={options.onDelete ?? (() => {})}
      onSave={options.onSave ?? (() => {})}
    />,
  );
}

test("PHOTO-12 the sheet is Photo details under Family photos, with the photo and its File: line", () => {
  renderSheet();

  const dialog = screen.getByRole("dialog", { name: "Photo details" });

  expect(within(dialog).getByText("Family photos")).toBeInTheDocument();
  expect(dialog.querySelector("img")).toHaveAttribute("src", "/photo.webp");
  expect(within(dialog).getByText("File: halloween-costumes-2025-10-31.jpg")).toBeInTheDocument();
  expect(within(dialog).queryByText("Color")).not.toBeInTheDocument();
});

test("PHOTO-12 a photo without a file name has no File: line", () => {
  const { fileName: _fileName, ...noName } = HALLOWEEN;

  renderSheet({ photo: noName });

  expect(screen.getByText("Family photos")).toBeInTheDocument();
  expect(screen.queryByText(/^File:/)).not.toBeInTheDocument();
});

test("PHOTO-12 Name, Date taken and Place show the values and where they came from", () => {
  renderSheet();

  expect(screen.getByLabelText("Name")).toHaveValue("Halloween costumes");
  expect(screen.getByLabelText("Date taken")).toHaveValue("2025-10-31");
  expect(screen.getByLabelText("Date taken")).toHaveAttribute("max", "2026-10-09");
  expect(screen.getByLabelText("Place")).toHaveValue("");
  expect(screen.getAllByText("Guessed from file name")).toHaveLength(2);
  expect(screen.getByText("Not in photo")).toBeInTheDocument();
});

test("PHOTO-12 a changed field's caption reads Edited", async () => {
  renderSheet();

  await userEvent.type(screen.getByLabelText("Place"), "Portland, OR");

  expect(screen.getByText("Edited")).toBeInTheDocument();
  expect(screen.queryByText("Not in photo")).not.toBeInTheDocument();
});

test("PHOTO-12 Save with an empty name shows Add a name and saves nothing", async () => {
  const onSave = vi.fn();
  renderSheet({ onSave });

  await userEvent.clear(screen.getByLabelText("Name"));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByText("Add a name")).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

test("PHOTO-12 Save hands over the trimmed photo, marked edited and checked", async () => {
  const onSave = vi.fn();
  renderSheet({ onSave });

  await userEvent.type(screen.getByLabelText("Place"), " Portland, OR ");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledWith({
    ...HALLOWEEN,
    place: "Portland, OR",
    sources: { title: "file-name", takenOn: "file-name", place: "edited" },
    checked: true,
  });
});

test("PHOTO-12 offline the sheet shows the banner and Save for later", () => {
  renderSheet({ offline: true });

  expect(screen.getByText("You’re offline")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save for later" })).toBeInTheDocument();
});

test("PHOTO-13 Delete turns into a red Delete photo, which deletes", async () => {
  const onDelete = vi.fn();
  renderSheet({ onDelete });

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete photo" }));

  expect(onDelete).toHaveBeenCalledTimes(1);
});

test("§8.9 Cancel on a changed photo asks Discard changes? and says the edits won’t be saved", async () => {
  const onClose = vi.fn();
  renderSheet({ onClose });

  await userEvent.type(screen.getByLabelText("Name"), "!");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("alert")).toHaveTextContent("Your edits to this photo won’t be saved.");
  expect(onClose).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("§8.9 Cancel with no changes closes at once", async () => {
  const onClose = vi.fn();
  renderSheet({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});
