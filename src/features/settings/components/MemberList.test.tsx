import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type Member, MemberList } from "./MemberList";

const MOM: Member = { id: "mom", name: "Mom", color: "coral", plans: 3, result: "Mom result." };

const TIN: Member = { id: "tin", name: "Tin", color: "sky", plans: 1, result: "Tin result." };

const BA: Member = { id: "ba", name: "Ba", color: "mint", plans: 0, result: "Ba result." };

afterEach(cleanup);

function Harness({
  members,
  onRemove,
}: {
  members: readonly Member[];
  onRemove: (id: string) => void;
}) {
  const [asking, setAsking] = useState<string | null>(null);

  return (
    <MemberList
      members={members}
      asking={asking}
      onAsk={setAsking}
      onCancel={() => setAsking(null)}
      onRemove={onRemove}
    />
  );
}

function renderList(members: readonly Member[] = [MOM, TIN, BA]) {
  const onRemove = vi.fn<(id: string) => void>();

  render(<Harness members={members} onRemove={onRemove} />);

  return onRemove;
}

test("FAM-08 the card counts members and each row's plans", () => {
  renderList();

  expect(screen.getByText("Family · 3 members")).toBeInTheDocument();
  const rows = within(screen.getByRole("list", { name: "Family members" })).getAllByRole(
    "listitem",
  );
  expect(rows.map((row) => row.textContent)).toEqual([
    expect.stringContaining("3 plans"),
    expect.stringContaining("1 plan"),
    expect.stringContaining("No plans"),
  ]);
});

test("FAM-08 each Remove button is named after its member", () => {
  renderList();

  for (const name of ["Mom", "Tin", "Ba"])
    expect(screen.getByRole("button", { name: `Remove ${name}` })).toBeInTheDocument();
});

test("FAM-08 the first tap asks and swaps the count for the result line", async () => {
  const onRemove = renderList();

  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));

  expect(screen.getByText("Mom result.")).toBeInTheDocument();
  expect(screen.queryByText("3 plans")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Remove Mom" })).toHaveLength(1);
  expect(onRemove).not.toHaveBeenCalled();
});

test("FAM-08 Cancel returns the row to its count", async () => {
  renderList();

  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByText("3 plans")).toBeInTheDocument();
  expect(screen.queryByText("Mom result.")).not.toBeInTheDocument();
});

test("FAM-08 the second tap removes the member once", async () => {
  const onRemove = renderList();

  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));
  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));

  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(onRemove).toHaveBeenCalledWith("mom");
});

test("FAM-08 asking on another row cancels the first", async () => {
  renderList();

  await userEvent.click(screen.getByRole("button", { name: "Remove Mom" }));
  await userEvent.click(screen.getByRole("button", { name: "Remove Tin" }));

  expect(screen.getByText("Tin result.")).toBeInTheDocument();
  expect(screen.queryByText("Mom result.")).not.toBeInTheDocument();
  expect(screen.getByText("3 plans")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
});

test("FAM-08 the last member has no Remove and the card says why", () => {
  renderList([MOM]);

  expect(screen.getByText("Family · 1 member")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
  expect(screen.getByText("The last member can’t be removed.")).toBeInTheDocument();
});
