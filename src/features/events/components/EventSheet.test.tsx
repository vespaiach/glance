import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type EventDraft,
  type EventSheetState,
  eventSwatches,
  initialEventSheet,
  type TimeFixture,
} from "../eventSheet";
import { EventSheet } from "./EventSheet";

const DRAFT = {
  title: "Lunch with Aunt Rosa",
  start: 720,
  end: 780,
  location: "Café Lumen",
  tone: 2,
} as const;

const BLANK = { title: "", start: 660, end: 720, location: "", tone: 1 } as const;

type Options = {
  mode?: "new" | "edit";
  time?: TimeFixture;
  offline?: boolean;
  initial?: EventSheetState;
  onClose?: () => void;
  onDelete?: () => void;
  onSave?: (draft: EventDraft) => void;
};

function renderSheet(options: Options = {}) {
  const mode = options.mode ?? "edit";

  return render(
    <EventSheet
      mode={mode}
      eyebrow="Friday, Oct 9"
      initial={options.initial ?? initialEventSheet(mode === "new" ? BLANK : DRAFT, options.time)}
      clock="12h"
      swatches={eventSwatches("fall")}
      offline={options.offline ?? false}
      onClose={options.onClose ?? (() => {})}
      onDelete={options.onDelete ?? (() => {})}
      onSave={options.onSave ?? (() => {})}
    />,
  );
}

test("EVT-01 a new event sheet is titled New event under the day eyebrow", () => {
  renderSheet({ mode: "new" });

  const dialog = screen.getByRole("dialog", { name: "New event" });

  expect(within(dialog).getByText("Friday, Oct 9")).toBeInTheDocument();
});

test("EVT-01 an existing event opens as Edit event", () => {
  renderSheet();

  expect(screen.getByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
});

test("EVT-02 Title and Where show the draft with their placeholders", () => {
  renderSheet();

  expect(screen.getByLabelText("Title")).toHaveValue("Lunch with Aunt Rosa");
  expect(screen.getByLabelText("Title")).toHaveAttribute("placeholder", "What’s happening");
  expect(screen.getByLabelText("Where")).toHaveValue("Café Lumen");
  expect(screen.getByLabelText("Where")).toHaveAttribute("placeholder", "Home, school, park…");
});

test("EVT-02 typing edits the title", async () => {
  renderSheet({ mode: "new" });

  await userEvent.type(screen.getByLabelText("Title"), "Picnic");

  expect(screen.getByLabelText("Title")).toHaveValue("Picnic");
});

test("EVT-02 a new event has color 1 pressed among the season swatches and Alert", () => {
  renderSheet({ mode: "new" });

  const colors = screen.getByRole("group", { name: "Color" });

  expect(
    within(colors)
      .getAllByRole("button")
      .map((swatch) => swatch.ariaLabel),
  ).toEqual(["Amber", "Rust", "Sage", "Coral", "Cream", "Alert"]);
  expect(within(colors).getByRole("button", { name: "Amber" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("EVT-02 tapping a swatch selects it", async () => {
  renderSheet();

  await userEvent.click(screen.getByRole("button", { name: "Alert" }));

  expect(screen.getByRole("button", { name: "Alert" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Rust" })).toHaveAttribute("aria-pressed", "false");
});

test("TPK-01 Starts and Ends show the draft times and the length", () => {
  renderSheet();

  expect(screen.getByRole("button", { name: "Starts, 12:00 PM. Change" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ends, 1:00 PM. Change" })).toBeInTheDocument();
  expect(screen.getByText("1 hr")).toBeInTheDocument();
});

test("TPK-02 tapping Starts opens the start picker below the fields", async () => {
  renderSheet();

  await userEvent.click(screen.getByRole("button", { name: /^Starts/ }));

  expect(screen.getByRole("group", { name: "Start time" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Starts/ })).toHaveAttribute("aria-expanded", "true");
});

test("TPK-03 a picker tap changes the time shown in the field", async () => {
  renderSheet({ time: "start" });

  await userEvent.click(screen.getByRole("button", { name: "1 PM" }));

  expect(screen.getByRole("button", { name: "Starts, 1:00 PM. Change" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ends, 2:00 PM. Change" })).toBeInTheDocument();
});

test("TPK-04 the Ends picker has the Length chips and No end time", () => {
  renderSheet({ time: "end" });

  const picker = screen.getByRole("group", { name: "End time" });

  expect(within(picker).getByRole("group", { name: "Length" })).toBeInTheDocument();
  expect(within(picker).getByRole("button", { name: "No end time" })).toBeInTheDocument();
});

test("TPK-04 No end time closes the picker and the field reads No end time", async () => {
  renderSheet({ time: "end" });

  await userEvent.click(screen.getByRole("button", { name: "No end time" }));

  expect(screen.queryByRole("group", { name: "End time" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ends, No end time. Change" })).toBeInTheDocument();
});

test("TPK-07 the error state shows Ends before it starts under Ends", () => {
  renderSheet({ time: "error" });

  expect(screen.getByRole("alert")).toHaveTextContent("Ends before it starts");
});

test("TPK-08 time=noend reads No end time on Ends", () => {
  renderSheet({ time: "noend" });

  expect(screen.getByRole("button", { name: "Ends, No end time. Change" })).toBeInTheDocument();
});

test("EVT-05 a new event offers Cancel and Add event", () => {
  renderSheet({ mode: "new" });

  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add event" })).toBeInTheDocument();
});

test("EVT-05 an edit saves with Save", () => {
  renderSheet();

  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("EVT-05 offline the primary reads Save for later under the offline banner", () => {
  renderSheet({ offline: true });

  expect(screen.getByRole("button", { name: "Save for later" })).toBeInTheDocument();
  expect(screen.getByText("You’re offline")).toBeInTheDocument();
  expect(
    screen.getByText("Changes save on this screen and sync when the connection is back."),
  ).toBeInTheDocument();
});

test("EVT-06 a new event has no Delete", () => {
  renderSheet({ mode: "new" });

  expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
});

test("EVT-06 Delete turns into Delete event, which deletes", async () => {
  const onDelete = vi.fn();

  renderSheet({ onDelete });

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(onDelete).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Delete event" }));

  expect(onDelete).toHaveBeenCalledTimes(1);
});

test("SHEET Cancel and Close discard the sheet", async () => {
  const onClose = vi.fn();

  renderSheet({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalledTimes(2);
});

test("EVT-05 Add event saves the draft", async () => {
  const onSave = vi.fn();

  renderSheet({ mode: "new", onSave });

  await userEvent.type(screen.getByLabelText("Title"), "Picnic");
  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(onSave).toHaveBeenCalledWith({ ...BLANK, title: "Picnic" });
});

test("EVT-03 Save with an empty title shows Add a title and saves nothing", async () => {
  const onSave = vi.fn();

  renderSheet({ mode: "new", onSave });

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(screen.getByText("Add a title")).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

test("EVT-03 the title error clears on the next change", async () => {
  renderSheet({ mode: "new" });

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));
  await userEvent.type(screen.getByLabelText("Title"), "P");

  expect(screen.queryByText("Add a title")).not.toBeInTheDocument();
});

test("TPK-07 a failed Save closes the picker and shows Ends before it starts", async () => {
  const onSave = vi.fn();

  const initial = { ...initialEventSheet({ ...DRAFT, end: 720 }), picker: "end" as const };

  renderSheet({ initial, onSave });

  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.queryByRole("group", { name: "End time" })).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Ends before it starts");
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  expect(onSave).not.toHaveBeenCalled();
});

test("TPK-09 offline Save for later saves the same way", async () => {
  const onSave = vi.fn();

  renderSheet({ offline: true, onSave });

  await userEvent.click(screen.getByRole("button", { name: "Save for later" }));

  expect(onSave).toHaveBeenCalledWith(DRAFT);
});
