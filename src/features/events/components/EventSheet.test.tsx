import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DetailsStatus } from "@/domain/eventStatus";
import type { Tag } from "@/domain/schemas";
import {
  type EventDraft,
  type EventSheetState,
  initialEventSheet,
  type TimeFixture,
} from "../eventSheet";
import { EventSheet } from "./EventSheet";

const WHO = { everyone: true, tagIds: [], notes: "" };

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `0195f0a0-0000-7000-8000-00000000050${n}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const MOM = tag(1, "Mom", "coral");

const DAD = tag(2, "Dad", "mint");

const FAMILY = [MOM, DAD];

const DRAFT: EventDraft = {
  title: "Lunch with Aunt Rosa",
  start: 720,
  end: 780,
  location: "Café Lumen",
  ...WHO,
};

const BLANK: EventDraft = { title: "", start: 660, end: 720, location: "", ...WHO };

type Options = {
  mode?: "new" | "edit";
  time?: TimeFixture;
  offline?: boolean;
  initial?: EventSheetState;
  tags?: Tag[];
  status?: DetailsStatus;
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
      tags={options.tags ?? FAMILY}
      offline={options.offline ?? false}
      status={options.status ?? null}
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

test("EVT-02 events have no color of their own", () => {
  renderSheet();

  expect(screen.queryByRole("group", { name: "Color" })).not.toBeInTheDocument();
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

test("A11Y-04 Tab moves through Close, the fields in visual order, then the actions, and wraps", async () => {
  renderSheet();

  expect(await tabOrder(15)).toEqual([
    screen.getByRole("button", { name: "Close" }),
    screen.getByLabelText("Title"),
    screen.getByRole("button", { name: "Set times" }),
    screen.getByRole("button", { name: "All day" }),
    screen.getByRole("button", { name: /^Starts/ }),
    screen.getByRole("button", { name: /^Ends/ }),
    screen.getByRole("button", { name: "Everyone" }),
    screen.getByRole("button", { name: "Mom" }),
    screen.getByRole("button", { name: "Dad" }),
    screen.getByLabelText("Where"),
    screen.getByLabelText("Notes"),
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
  await userEvent.type(screen.getByLabelText("Where"), "!");

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

function whoPill(name: string) {
  return within(screen.getByRole("group", { name: "Who" })).getByRole("button", { name });
}

function pressed() {
  return ["Everyone", ...FAMILY.map((one) => one.name)].filter(
    (name) => whoPill(name).getAttribute("aria-pressed") === "true",
  );
}

test("EVT-11 Who offers Everyone and each tag, all selected for an everyone plan", () => {
  renderSheet();

  expect(pressed()).toEqual(["Everyone", "Mom", "Dad"]);
});

test("EVT-11 a plan for some tags selects only them", () => {
  renderSheet({ initial: initialEventSheet({ ...DRAFT, everyone: false, tagIds: [DAD.id] }) });

  expect(pressed()).toEqual(["Dad"]);
});

test("EVT-11 tapping a tag while everyone is on keeps the others", async () => {
  renderSheet();

  await userEvent.click(whoPill("Mom"));

  expect(pressed()).toEqual(["Dad"]);
});

test("EVT-11 tapping Everyone when it is selected does nothing", async () => {
  renderSheet();

  await userEvent.click(whoPill("Everyone"));

  expect(pressed()).toEqual(["Everyone", "Mom", "Dad"]);
});

test("EVT-11 turning the last tag off leaves nobody", async () => {
  renderSheet({ initial: initialEventSheet({ ...DRAFT, everyone: false, tagIds: [DAD.id] }) });

  await userEvent.click(whoPill("Dad"));

  expect(pressed()).toEqual([]);
});

test("EVT-11 selecting every tag one by one means everyone", async () => {
  renderSheet({ initial: initialEventSheet({ ...DRAFT, everyone: false, tagIds: [DAD.id] }) });

  await userEvent.click(whoPill("Mom"));

  expect(pressed()).toEqual(["Everyone", "Mom", "Dad"]);
});

test("EVT-11 Save sends tag ids for some tags and everyone for all", async () => {
  const onSave = vi.fn();

  renderSheet({ onSave });

  await userEvent.click(whoPill("Mom"));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  await userEvent.click(whoPill("Everyone"));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenNthCalledWith(1, { ...DRAFT, everyone: false, tagIds: [DAD.id] });
  expect(onSave).toHaveBeenNthCalledWith(2, DRAFT);
});

test("EVT-02 Notes is a 3-row field that edits the draft", async () => {
  const onSave = vi.fn();

  renderSheet({ onSave });

  const notes = screen.getByLabelText("Notes");

  await userEvent.type(notes, "Bring a gift");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(notes).toHaveAttribute("rows", "3");
  expect(notes).toHaveAttribute("placeholder", "Anything to remember");
  expect(onSave).toHaveBeenCalledWith({ ...DRAFT, notes: "Bring a gift" });
});

test("§8.9 a Who change asks Discard changes? on Cancel", async () => {
  renderSheet();

  await userEvent.click(whoPill("Mom"));
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByText("Discard changes?")).toBeInTheDocument();
});

describe("Event details", () => {
  const LUNCH: EventDraft = {
    ...DRAFT,
    everyone: false,
    tagIds: [MOM.id, DAD.id],
    notes: "Bring a gift\nAnd the card",
  };

  const details = (draft: EventDraft = LUNCH) => initialEventSheet(draft, undefined, false, true);

  test("EVT-09 details are titled with the event under the day eyebrow", () => {
    renderSheet({ initial: details() });

    const dialog = screen.getByRole("dialog", { name: "Lunch with Aunt Rosa" });

    expect(within(dialog).getByText("Friday, Oct 9")).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  test("EVT-09 the color block shows the length over the time with mono AM/PM", () => {
    renderSheet({ initial: details() });

    expect(screen.getByText("1 hr")).toBeInTheDocument();
    expect(screen.getByText("12:00 – 1:00")).toBeInTheDocument();
    expect(screen.getByText("PM")).toBeInTheDocument();
  });

  test("EVT-09 an event with no end reads No end time", () => {
    const { end: _, ...noEnd } = LUNCH;

    renderSheet({ initial: details(noEnd) });

    expect(screen.getByText("No end time")).toBeInTheDocument();
    expect(screen.getByText("12:00")).toBeInTheDocument();
  });

  test("EVT-09 an all-day event reads Whole day and All day", () => {
    renderSheet({ initial: details({ ...LUNCH, allDay: true }) });

    expect(screen.getByText("Whole day")).toBeInTheDocument();
    expect(screen.getByText("All day")).toBeInTheDocument();
  });

  test("EVT-09 Who lists the tags by name, Where and Notes keep their text", () => {
    renderSheet({ initial: details() });

    const who = screen.getByRole("list", { name: "Who" });

    expect(
      within(who)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Mom", "Dad"]);
    expect(screen.getByText("Café Lumen")).toBeInTheDocument();
    expect(screen.getByText("Bring a gift And the card")).toHaveTextContent(
      "Bring a gift\nAnd the card",
      { normalizeWhitespace: false },
    );
  });

  test("EVT-09 an everyone event reads Everyone", () => {
    renderSheet({ initial: details(DRAFT) });

    const who = screen.getByRole("list", { name: "Who" });

    expect(within(who).getByRole("listitem")).toHaveTextContent("Everyone");
  });

  test("EVT-09 empty Where and Notes rows are hidden", () => {
    renderSheet({ initial: details({ ...DRAFT, location: " ", notes: "" }) });

    expect(screen.queryByText("Where")).not.toBeInTheDocument();
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  test("EVT-09 a running event shows Happening now and Edit", () => {
    renderSheet({ initial: details(), status: "now" });

    expect(screen.getByText("Happening now")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  test("EVT-09 an ended event shows Ended, no Edit and says it can't be changed", () => {
    renderSheet({ initial: details(), status: "ended" });

    expect(screen.getByText("Ended")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByText("This event has ended and can’t be changed.")).toBeInTheDocument();
  });

  test("EVT-09 details have no offline banner", () => {
    renderSheet({ initial: details(), offline: true });

    expect(screen.queryByText("You’re offline")).not.toBeInTheDocument();
  });

  test("EVT-09 ✕ closes the details", async () => {
    const onClose = vi.fn();
    renderSheet({ initial: details(), onClose });

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("EVT-10 Edit swaps the same sheet to Edit event", async () => {
    renderSheet({ initial: details() });

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("dialog", { name: "Edit event" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Lunch with Aunt Rosa");
  });

  test("EVT-10 Cancel with no change returns to details", async () => {
    const onClose = vi.fn();
    renderSheet({ initial: details(), onClose });

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("dialog", { name: "Lunch with Aunt Rosa" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("EVT-10 Cancel after a change asks, and Discard returns to details unchanged", async () => {
    const onClose = vi.fn();
    renderSheet({ initial: details(), onClose });

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.type(screen.getByLabelText("Title"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.getByRole("dialog", { name: "Lunch with Aunt Rosa" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("EVT-10 ✕ after a change asks, and Discard closes the sheet", async () => {
    const onClose = vi.fn();
    renderSheet({ initial: details(), onClose });

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.type(screen.getByLabelText("Title"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("EVT-07 Save from details saves and returns to details with the new values", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    renderSheet({ initial: details(), onClose, onSave });

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.type(screen.getByLabelText("Title"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ ...LUNCH, title: "Lunch with Aunt Rosa!" });
    expect(screen.getByRole("dialog", { name: "Lunch with Aunt Rosa!" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("EVT-07 Save on an edit opened directly closes the sheet", async () => {
    const onClose = vi.fn();
    renderSheet({ onClose });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("EVT-10 Delete from an edit opened in details closes the sheet", async () => {
    const onDelete = vi.fn();
    renderSheet({ initial: details(), onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
