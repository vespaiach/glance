import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { TextInput } from "./TextInput";

function renderSheet(onClose = vi.fn()) {
  render(
    <>
      <button type="button">Outside</button>
      <Sheet
        eyebrow="Edit event"
        title="Soccer practice"
        closeLabel="Close"
        onClose={onClose}
        startActions={<Button variant="ghost">Delete</Button>}
        endActions={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button>Save</Button>
          </>
        }
      >
        <TextInput label="Title" value="Soccer practice" onChange={() => {}} />
      </Sheet>
    </>,
  );

  return onClose;
}

test("A11Y Sheet is a modal dialog labelled by its title", () => {
  renderSheet();

  const dialog = screen.getByRole("dialog", { name: "Soccer practice" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(screen.getByText("Edit event")).toBeInTheDocument();
});

test("SHEET focus moves into the sheet when it opens", () => {
  renderSheet();

  expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
});

test("SHEET Tab from the last control wraps to the first", async () => {
  renderSheet();

  screen.getByRole("button", { name: "Save" }).focus();
  await userEvent.tab();

  expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
});

test("SHEET Shift+Tab from the first control wraps to the last", async () => {
  renderSheet();

  screen.getByRole("button", { name: "Close" }).focus();
  await userEvent.tab({ shift: true });

  expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
});

test("SHEET Tab never leaves the sheet", async () => {
  renderSheet();

  for (let step = 0; step < 6; step += 1) {
    await userEvent.tab();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  }
});

test("SHEET tapping the scrim closes the sheet", async () => {
  const onClose = renderSheet();

  await userEvent.click(screen.getByRole("dialog").previousElementSibling as HTMLElement);

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("§8.9 onScrimTap takes the scrim tap instead of onClose", async () => {
  const onClose = vi.fn();
  const onScrimTap = vi.fn();
  render(
    <Sheet title="New event" closeLabel="Close" onClose={onClose} onScrimTap={onScrimTap}>
      <p>Body</p>
    </Sheet>,
  );

  await userEvent.click(screen.getByRole("dialog").previousElementSibling as HTMLElement);

  expect(onScrimTap).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
});

test("SHEET the close button closes the sheet", async () => {
  const onClose = renderSheet();

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("SHEET Escape closes the sheet", async () => {
  const onClose = renderSheet();

  await userEvent.keyboard("{Escape}");

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("SHEET taps inside the card do not close the sheet", async () => {
  const onClose = renderSheet();

  await userEvent.click(screen.getByText("Edit event"));

  expect(onClose).not.toHaveBeenCalled();
});

test("SHEET focus returns to the opener when the sheet closes", () => {
  const Page = ({ open }: { open: boolean }) => (
    <>
      <button type="button">Open</button>
      {open && (
        <Sheet title="New note" closeLabel="Close" onClose={() => {}}>
          <span>Body</span>
        </Sheet>
      )}
    </>
  );
  const { rerender } = render(<Page open={false} />);
  screen.getByRole("button", { name: "Open" }).focus();

  rerender(<Page open />);
  rerender(<Page open={false} />);

  expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
});

test("KB-02 with the keyboard up, the sheet scrolls inside to the focused field", () => {
  render(
    <Sheet title="New note" closeLabel="Close" onClose={() => {}} keyboardInset={300}>
      <TextInput label="Message" value="" onChange={() => {}} multiline />
    </Sheet>,
  );

  const body = sheetBody();
  body.getBoundingClientRect = () => ({ top: 140 }) as DOMRect;
  screen.getByText("Message").getBoundingClientRect = () => ({ top: 300 }) as DOMRect;

  screen.getByRole("textbox", { name: "Message" }).focus();

  expect(body.scrollTop).toBe(300 - 140 - 24);
});

test("§8.9 the header and the actions sit outside the scrolling body", () => {
  renderSheet();

  const body = sheetBody();

  expect(body).toContainElement(screen.getByRole("textbox", { name: "Title" }));
  expect(body).not.toContainElement(screen.getByRole("heading", { name: "Soccer practice" }));
  expect(body).not.toContainElement(screen.getByRole("button", { name: "Close" }));
  expect(body).not.toContainElement(screen.getByRole("button", { name: "Save" }));
});

function sheetBody() {
  return screen.getByRole("dialog").querySelector("[data-sheet-body]") as HTMLElement;
}
