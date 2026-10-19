import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Member, type MemberColor, MemberColorSchema } from "@/domain/schemas";
import { type FamilyRow, type FamilySheetState, initialFamilySheet } from "../familySheet";
import { FamilySheet } from "./FamilySheet";

const member = (n: number, name: string, color: MemberColor): Member => ({
  id: `member-${n}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = member(1, "Minh-An", "lilac");

const MOM = member(2, "Mom", "sky");

const DAD = member(3, "Dad", "coral");

const ROWS: FamilyRow[] = [
  { member: AN, solo: 0, shared: 1 },
  { member: MOM, solo: 2, shared: 12 },
  { member: DAD, solo: 0, shared: 0 },
];

type Options = {
  rows?: readonly FamilyRow[];
  initial?: FamilySheetState;
  onAdd?: (name: string, color: MemberColor) => void;
  onRemove?: (id: string) => void;
  onClose?: () => void;
};

function renderSheet(options: Options = {}) {
  return render(
    <FamilySheet
      rows={options.rows ?? ROWS}
      initial={options.initial ?? initialFamilySheet()}
      onAdd={options.onAdd ?? (() => {})}
      onRemove={options.onRemove ?? (() => {})}
      onClose={options.onClose ?? (() => {})}
    />,
  );
}

function rowOf(name: string) {
  const list = screen.getByRole("list", { name: "Family members" });

  const row = within(list)
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText(name) !== null);

  if (!row) throw new Error(`no row for ${name}`);

  return row;
}

test("FAM-01 the Family sheet counts the members and Done closes it", async () => {
  const onClose = vi.fn();

  renderSheet({ onClose });

  const dialog = screen.getByRole("dialog", { name: "Family" });

  expect(within(dialog).getByText("3 members")).toBeInTheDocument();

  await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("FAM-02 each row shows the member's name and plan count", () => {
  renderSheet();

  expect(within(rowOf("Minh-An")).getByText("1 plan")).toBeInTheDocument();
  expect(within(rowOf("Mom")).getByText("14 plans")).toBeInTheDocument();
  expect(within(rowOf("Dad")).getByText("No plans")).toBeInTheDocument();
});

test("FAM-02 every member has Remove except the last one", () => {
  const { unmount } = renderSheet();

  expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(3);

  unmount();
  renderSheet({ rows: [{ member: AN, solo: 0, shared: 0 }] });

  expect(screen.getByText("1 member")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove Minh-An" })).not.toBeInTheDocument();
});

test("FAM-03 Remove asks under the row with what happens to their plans", async () => {
  renderSheet();

  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));

  const confirm = within(rowOf("Mom")).getByRole("alert");

  expect(within(confirm).getByText("Remove Mom?")).toBeInTheDocument();
  expect(
    within(confirm).getByText(
      "Their 2 plans are deleted. They’re taken off 12 plans shared with others.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove Mom" })).not.toBeInTheDocument();
});

test("FAM-03 the impact line only says the parts that apply", () => {
  const { unmount } = renderSheet({ initial: initialFamilySheet({ removing: AN.id }) });

  expect(screen.getByText("They’re taken off 1 plan shared with others.")).toBeInTheDocument();

  unmount();
  renderSheet({ initial: initialFamilySheet({ removing: DAD.id }) });

  expect(screen.getByText("They have no plans.")).toBeInTheDocument();
});

test("FAM-03 Cancel keeps the member and Remove removes them", async () => {
  const onRemove = vi.fn();

  renderSheet({ onRemove, initial: initialFamilySheet({ removing: MOM.id }) });

  await userEvent.click(within(rowOf("Mom")).getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(onRemove).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));
  await userEvent.click(within(rowOf("Mom")).getByRole("button", { name: "Remove" }));

  expect(onRemove).toHaveBeenCalledWith(MOM.id);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("FAM-04 the swatches offer only free colors with the first one preselected", () => {
  renderSheet();

  const swatches = within(screen.getByRole("group", { name: "Color" })).getAllByRole("button");

  expect(swatches.map((swatch) => swatch.getAttribute("aria-label"))).toEqual([
    "Mint",
    "Sun",
    "Pink",
    "Lime",
    "Rust",
    "Glacier",
    "Amber",
    "Sage",
    "Ice",
  ]);
  expect(screen.getByRole("button", { name: "Mint" })).toHaveAttribute("aria-pressed", "true");
});

test("FAM-04 all 12 colors show once every color is taken", () => {
  const rows = MemberColorSchema.options.map((color, index) => ({
    member: member(index + 1, color, color),
    solo: 0,
    shared: 0,
  }));

  renderSheet({ rows });

  expect(within(screen.getByRole("group", { name: "Color" })).getAllByRole("button")).toHaveLength(
    12,
  );
});

test("FAM-04 Add adds the trimmed name with the picked color and clears the field", async () => {
  const onAdd = vi.fn();

  renderSheet({ onAdd });

  await userEvent.type(screen.getByRole("textbox", { name: "Name" }), " Bao ");
  await userEvent.click(screen.getByRole("button", { name: "Sun" }));
  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).toHaveBeenCalledWith("Bao", "sun");
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
});

test("FAM-04 Return in the name field adds the member", async () => {
  const onAdd = vi.fn();

  renderSheet({ onAdd });

  await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "Bao{Enter}");

  expect(onAdd).toHaveBeenCalledWith("Bao", "mint");
});

test("FAM-04 an empty name says Add a name and a typed key clears it", async () => {
  const onAdd = vi.fn();

  renderSheet({ onAdd });

  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByText("Add a name")).toBeInTheDocument();
  expect(onAdd).not.toHaveBeenCalled();

  await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "B");

  expect(screen.queryByText("Add a name")).not.toBeInTheDocument();
});

test("FAM-04 a name already in the family, ignoring case, says Already in the family", async () => {
  const onAdd = vi.fn();

  renderSheet({ onAdd });

  await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "mom");
  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByText("Already in the family")).toBeInTheDocument();
  expect(onAdd).not.toHaveBeenCalled();
});

test("FAM-06 closing with a typed name asks Discard changes? and Discard closes", async () => {
  const onClose = vi.fn();

  renderSheet({ onClose, initial: initialFamilySheet({ name: "Bao" }) });

  await userEvent.click(screen.getByRole("button", { name: "Done" }));

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByText("Discard changes?")).toBeInTheDocument();
  expect(screen.getByText("Bao won’t be added.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("FAM-06 Keep editing returns to the sheet with the name kept", async () => {
  const onClose = vi.fn();

  renderSheet({ onClose, initial: initialFamilySheet({ name: "Bao" }) });

  await userEvent.click(screen.getByRole("button", { name: "Close" }));
  await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));

  expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Bao");
  expect(onClose).not.toHaveBeenCalled();
});

test("FAM-01 with no typed name, ✕ and Done close at once", async () => {
  const onClose = vi.fn();

  renderSheet({ onClose });

  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("A11Y the remove confirm takes focus and Cancel hands it back to that row's Remove", async () => {
  renderSheet();

  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));

  expect(within(rowOf("Mom")).getByRole("button", { name: "Cancel" })).toHaveFocus();

  await userEvent.click(within(rowOf("Mom")).getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("button", { name: "Remove Mom" })).toHaveFocus();
});

test("A11Y removing a member leaves focus in the sheet", async () => {
  const { rerender } = renderSheet({ initial: initialFamilySheet({ removing: MOM.id }) });

  await userEvent.click(within(rowOf("Mom")).getByRole("button", { name: "Remove" }));

  rerender(
    <FamilySheet
      rows={ROWS.filter((row) => row.member.id !== MOM.id)}
      initial={initialFamilySheet()}
      onAdd={() => {}}
      onRemove={() => {}}
      onClose={() => {}}
    />,
  );

  expect(screen.getByRole("dialog", { name: "Family" })).toHaveFocus();
});
