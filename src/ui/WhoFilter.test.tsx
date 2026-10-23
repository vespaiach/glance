import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tag } from "@/domain/schemas";
import type { TagFilter } from "@/domain/tags";
import { WhoFilter, type WhoFilterLabels } from "./WhoFilter";

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `tag-${n}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = tag(1, "Minh-An", "lilac");

const MOM = tag(2, "Mom", "coral");

const DAD = tag(3, "Dad", "sky");

const FAMILY = [AN, MOM, DAD];

const ALL = new Set(FAMILY.map((one) => one.id));

const LABELS: WhoFilterLabels = {
  everyone: "Everyone",
  nobody: "No one",
  people: (count) => `${count} people`,
  members: (count) => `${count} members`,
  title: "Show plans for",
  change: (label) => `Show plans for: ${label}. Change`,
  more: (count) => `+${count}`,
  close: "Close",
  done: "Done",
};

function renderFilter(selected: ReadonlySet<string> = ALL, extra: { max?: number } = {}) {
  const onChange = vi.fn<(filter: TagFilter) => void>();

  render(
    <WhoFilter
      tags={FAMILY}
      selected={selected}
      size="large"
      max={extra.max ?? 8}
      labels={LABELS}
      onChange={onChange}
    />,
  );

  return onChange;
}

const stack = (label: string) =>
  screen.getByRole("button", { name: `Show plans for: ${label}. Change` });

const sheet = () => screen.getByRole("dialog", { name: "Show plans for" });

const row = (name: string) => within(sheet()).getByRole("checkbox", { name });

test("CAL-05 the stack names the filter and shows initials for the people shown", () => {
  renderFilter(new Set([AN.id, MOM.id]));

  const button = stack("Minh-An, Mom");
  expect(button).toHaveAttribute("aria-haspopup", "dialog");
  expect(within(button).getByText("MA")).toBeInTheDocument();
  expect(within(button).getByText("Mom", { selector: "[aria-hidden] span" })).toBeInTheDocument();
  expect(within(button).queryByText("Dad")).not.toBeInTheDocument();
});

test("CAL-05 past the cap the stack shows one fewer and +N", () => {
  renderFilter(ALL, { max: 2 });

  expect(within(stack("Everyone")).getByText("+2")).toBeInTheDocument();
});

test("CAL-05 the stack opens Show plans for with Everyone first and every tag checked", async () => {
  renderFilter();

  await userEvent.click(stack("Everyone"));

  expect(within(sheet()).getByText("3 members")).toBeInTheDocument();
  const rows = within(sheet()).getAllByRole("checkbox");
  expect(rows.map((one) => one.textContent)).toEqual(["Everyone", "MAMinh-An", "MomMom", "DadDad"]);
  for (const one of rows) expect(one).toHaveAttribute("aria-checked", "true");
});

test("CAL-05 a row toggles that tag", async () => {
  const onChange = renderFilter();

  await userEvent.click(stack("Everyone"));
  await userEvent.click(row("Mom"));

  expect(onChange).toHaveBeenCalledWith(new Set([AN.id, DAD.id]));
});

test("CAL-05 a row turns an unchecked tag back on, back to every tag", async () => {
  const onChange = renderFilter(new Set([AN.id, DAD.id]));

  await userEvent.click(stack("Minh-An, Dad"));

  expect(row("Everyone")).toHaveAttribute("aria-checked", "false");
  expect(row("Mom")).toHaveAttribute("aria-checked", "false");

  await userEvent.click(row("Mom"));

  expect(onChange).toHaveBeenCalledWith("all");
});

test("CAL-05 Everyone clears every tag when all are selected, else selects all", async () => {
  const onChange = renderFilter();

  await userEvent.click(stack("Everyone"));
  await userEvent.click(row("Everyone"));

  expect(onChange).toHaveBeenLastCalledWith(new Set());
});

test("CAL-05 Everyone selects all when some are off", async () => {
  const onChange = renderFilter(new Set([MOM.id]));

  await userEvent.click(stack("Mom"));
  await userEvent.click(row("Everyone"));

  expect(onChange).toHaveBeenLastCalledWith("all");
});

test("CAL-05 nobody shows one gray circle and No one", () => {
  renderFilter(new Set());

  expect(stack("No one")).toBeInTheDocument();
});

test.each([
  ["Escape", async () => userEvent.keyboard("{Escape}")],
  ["Done", async () => userEvent.click(within(sheet()).getByRole("button", { name: "Done" }))],
  ["Close", async () => userEvent.click(within(sheet()).getByRole("button", { name: "Close" }))],
])("CAL-05 %s closes the list and focus returns to the stack", async (_, close) => {
  renderFilter();

  await userEvent.click(stack("Everyone"));
  await close();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(stack("Everyone")).toHaveFocus();
});

test("CAL-05 a scrim tap closes the list", async () => {
  renderFilter();

  await userEvent.click(stack("Everyone"));
  const scrim = sheet().previousElementSibling;
  if (!(scrim instanceof HTMLElement)) throw new Error("no scrim");
  await userEvent.click(scrim);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("CAL-05 whosheet=1 opens with the list showing", () => {
  render(
    <WhoFilter
      tags={FAMILY}
      selected={ALL}
      size="today"
      max={5}
      labels={LABELS}
      defaultOpen
      onChange={() => {}}
    />,
  );

  expect(sheet()).toBeInTheDocument();
});
