import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

type Props = ComponentProps<typeof DeleteAccountDialog>;

function renderDialog(overrides: Partial<Props> = {}): Props {
  const props: Props = {
    email: "maria@example.com",
    counts: { events: 12, notes: 3, photos: 48, tags: 4 },
    screens: 2,
    state: { kind: "ask" },
    onToggle: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  render(<DeleteAccountDialog {...props} />);

  return props;
}

function deleteButton() {
  return screen.getByRole("button", { name: /Delete account|Deleting…/ });
}

test("SET-14 is an alert dialog with the email, the title and what gets erased", () => {
  renderDialog();

  const dialog = screen.getByRole("alertdialog", { name: "Delete account?" });
  const items = screen.getAllByRole("listitem").map((item) => item.textContent);

  expect(dialog).toHaveTextContent("maria@example.com");
  expect(items).toEqual([
    "Events12",
    "Notes3",
    "Photos48",
    "Family members4",
    "Signed-in screens2",
  ]);
});

test("SET-14 Delete account is disabled until the box is checked", () => {
  renderDialog();

  expect(screen.getByRole("checkbox", { name: /I understand/ })).not.toBeChecked();
  expect(deleteButton()).toBeDisabled();
});

test("SET-14 the checkbox reports a toggle", async () => {
  const props = renderDialog();

  await userEvent.click(screen.getByRole("checkbox", { name: /I understand/ }));

  expect(props.onToggle).toHaveBeenCalledOnce();
});

test("SET-14 once checked, Delete account confirms", async () => {
  const props = renderDialog({ state: { kind: "ack" } });

  expect(screen.getByRole("checkbox", { name: /I understand/ })).toBeChecked();

  await userEvent.click(deleteButton());

  expect(props.onConfirm).toHaveBeenCalledOnce();
});

test("SET-14 Keep account, a scrim tap and Escape cancel", async () => {
  const props = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "Keep account" }));
  await userEvent.click(screen.getByTestId("dialog-scrim"));
  fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

  expect(props.onCancel).toHaveBeenCalledTimes(3);
});

test("SET-14 while deleting both buttons are locked and the status shows", () => {
  renderDialog({ state: { kind: "deleting" } });

  expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Keep account" })).toBeDisabled();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Erasing events, notes and photos. Keep this screen on.",
  );
  expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-busy", "true");
});

test("SET-14 a failed delete shows the error, and Try again confirms again", async () => {
  const props = renderDialog({ state: { kind: "failed" } });

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Couldn’t delete the accountNothing was erased. Try again.",
  );

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(props.onConfirm).toHaveBeenCalledOnce();
});

test("SET-14 counts still loading show a dash", () => {
  renderDialog({ counts: undefined });

  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Events–");
});
