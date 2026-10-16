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

async function tabOrder(count: number) {
  const visited: Element[] = [];

  for (let step = 0; step < count; step += 1) {
    await userEvent.tab();
    visited.push(document.activeElement as Element);
  }

  return visited;
}

test("A11Y-04 Tab moves through Close, the fields in visual order, the swatches, then the actions, and wraps", async () => {
  renderSheet();

  const swatches = within(screen.getByRole("group", { name: "Color" })).getAllByRole("button");

  expect(await tabOrder(17)).toEqual([
    screen.getByRole("button", { name: "Close" }),
    screen.getByLabelText("Title"),
    screen.getByRole("button", { name: "Set times" }),
    screen.getByRole("button", { name: "All day" }),
    screen.getByRole("button", { name: /^Starts/ }),
    screen.getByRole("button", { name: /^Ends/ }),
    screen.getByLabelText("Where"),
    ...swatches,
    screen.getByRole("button", { name: "Delete" }),
    screen.getByRole("button", { name: "Cancel" }),
    screen.getByRole("button", { name: "Save" }),
    screen.getByRole("button", { name: "Close" }),
  ]);
});

async function changeTitle() {
  await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "!");
}

function scrim() {
  return screen.getByRole("dialog").previousElementSibling as HTMLElement;
}

test("§8.9 Cancel on a changed event asks Discard changes? in place of the footer", async () => {
  const onClose = vi.fn();
  renderSheet({ onClose });

  await changeTitle();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Discard changes?Your edits to this event won’t be saved.",
  );
  expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("§8.9 a changed new event says it won’t be added", async () => {
  renderSheet({ mode: "new" });

  await changeTitle();
  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(screen.getByRole("alert")).toHaveTextContent("This event won’t be added.");
});

test("§8.9 the scrim and Escape ask too on a changed event", async () => {
  const onClose = vi.fn();
  renderSheet({ onClose });

  await changeTitle();
  await userEvent.click(scrim());

  expect(screen.getByRole("alert")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  await userEvent.keyboard("{Escape}");

  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("§8.9 Discard closes the sheet without saving", async () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  renderSheet({ onClose, onSave });

  await changeTitle();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSave).not.toHaveBeenCalled();
});

test("§8.9 Keep editing brings the footer back with the edit kept", async () => {
  renderSheet();

  await changeTitle();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Lunch with Aunt Rosa!");
  expect(screen.getByRole("dialog")).toHaveFocus();
});

test("§8.9 while it asks, the scrim is ignored and ✕ discards", async () => {
  const onClose = vi.fn();
  renderSheet({ onClose });

  await changeTitle();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(scrim());

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("§8.9 an edit while it asks brings the normal footer back", async () => {
  renderSheet();

  await changeTitle();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Coral" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
});

test("§8.9 asking closes the open time picker", async () => {
  renderSheet({ time: "start" });

  await userEvent.click(screen.getByRole("button", { name: "1 PM" }));
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("group", { name: "Start time" })).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

test("§8.9 the discard=1 state opens asking", () => {
  renderSheet({ mode: "new", initial: initialEventSheet(BLANK, undefined, true) });

  expect(screen.getByRole("alert")).toHaveTextContent("This event won’t be added.");
});

test("EVT-02 the Time row offers Set times · All day with Set times chosen", () => {
  renderSheet();

  const time = screen.getByRole("group", { name: "Time" });

  expect(within(time).getByRole("button", { name: "Set times" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(within(time).getByRole("button", { name: "All day" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("EVT-08 All day hides Starts, Ends and the open picker", async () => {
  renderSheet({ time: "start" });

  await userEvent.click(screen.getByRole("button", { name: "All day" }));

  expect(screen.queryByRole("button", { name: /^Starts/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Ends/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Start time" })).not.toBeInTheDocument();
});

test("EVT-08 Set times brings back the draft's times", async () => {
  renderSheet();

  await userEvent.click(screen.getByRole("button", { name: "All day" }));
  await userEvent.click(screen.getByRole("button", { name: "Set times" }));

  expect(screen.getByRole("button", { name: "Starts, 12:00 PM. Change" })).toBeInTheDocument();
});

test("EVT-08 an all-day event opens on All day", () => {
  renderSheet({ initial: initialEventSheet({ ...DRAFT, allDay: true }) });

  expect(screen.getByRole("button", { name: "All day" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: /^Starts/ })).not.toBeInTheDocument();
});

test("TPK-07 an all-day event saves even with the draft times out of order", async () => {
  const onSave = vi.fn();

  renderSheet({ time: "error", onSave });

  await userEvent.click(screen.getByRole("button", { name: "All day" }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledWith({ ...DRAFT, end: 690, allDay: true });
});
