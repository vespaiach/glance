import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import type { CalendarEvent, Member } from "@/domain/schemas";
import { shellWrapper } from "@/shell/providers/testShell";
import { SheetHost, type SheetRequest, useSheetHost } from "@/shell/SheetHost";
import { FamilySheetScreen } from "./FamilySheetScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/calendar" }));

const NOW = new Date("2026-10-09T17:41:00.000Z");

const id = (group: number, n: number) =>
  `0195f0a0-0000-7000-800${group}-${String(n).padStart(12, "0")}`;

const member = (n: number, name: string, color: Member["color"]): Member => ({
  id: id(1, n),
  name,
  color,
  createdAt: `2026-10-0${n}T09:00:00.000Z`,
});

const AN = member(1, "Minh-An", "lilac");

const MOM = member(2, "Mom", "sky");

const plan = (n: number, members: Member[]): CalendarEvent => ({
  id: id(2, n),
  title: `Plan ${n}`,
  startAt: "2026-10-09T16:00:00.000Z",
  everyone: false,
  memberIds: members.map((one) => one.id),
});

const SOLO = plan(1, [MOM]);

const SHARED = plan(2, [AN, MOM]);

let store: Harness;

beforeEach(async () => {
  store = openHarness("glance-family-sheet-test");

  await store.db.members.bulkPut([synced(AN), synced(MOM)]);
  await store.db.events.bulkPut([synced(SOLO), synced(SHARED)]);
});

afterEach(async () => {
  cleanup();

  await store.close();
});

function OpenSheet() {
  const { sheet } = useSheetHost();

  return <output aria-label="Open sheet">{sheet ? JSON.stringify(sheet) : ""}</output>;
}

function renderSheet(initial: SheetRequest) {
  const Shell = shellWrapper(store, { frozenAt: NOW, overrides: {} });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <SheetHost initial={initial}>{children}</SheetHost>
    </Shell>
  );

  return render(
    <>
      <FamilySheetScreen />
      <OpenSheet />
    </>,
    { wrapper },
  );
}

function rowNames() {
  const list = screen.getByRole("list", { name: "Family members" });

  return within(list)
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

test("FAM-02 a family request lists the members with their plan counts", async () => {
  renderSheet({ kind: "family" });

  expect(await screen.findByRole("dialog", { name: "Family" })).toBeInTheDocument();
  expect(screen.getByText("2 members")).toBeInTheDocument();
  await waitFor(() => expect(rowNames()).toEqual(["Minh-An1 planRemove", "Mom2 plansRemove"]));
});

test("FAM-05 Add saves the member last with a free color and it shows at the end", async () => {
  renderSheet({ kind: "family" });

  await userEvent.type(await screen.findByRole("textbox", { name: "Name" }), "Bao");
  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(screen.getByText("3 members")).toBeInTheDocument());
  expect(rowNames().at(-1)).toBe("BaoNo plansRemove");
  expect((await store.db.members.toArray()).at(-1)).toMatchObject({
    name: "Bao",
    color: "coral",
    createdAt: NOW.toISOString(),
  });
  expect(await store.db.outbox.toArray()).toMatchObject([
    { entity: "members", op: "put", payload: { name: "Bao" } },
  ]);
});

test("FAM-03 Remove deletes the member's solo plans and strips the shared ones", async () => {
  renderSheet({ kind: "family", removing: MOM.id });

  const dialog = await screen.findByRole("dialog", { name: "Family" });

  await userEvent.click(await within(dialog).findByRole("button", { name: "Remove" }));

  await waitFor(() => expect(screen.getByText("1 member")).toBeInTheDocument());
  expect(await store.db.events.get(SOLO.id)).toHaveProperty("deletedAt");
  expect(await store.db.events.get(SHARED.id)).toMatchObject({ memberIds: [AN.id] });
  expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
});

test("FAM-04 a fixture request opens with the typed name and its error", async () => {
  renderSheet({ kind: "family", name: "Bao", error: true });

  expect(await screen.findByRole("textbox", { name: "Name" })).toHaveValue("Bao");
  expect(screen.getByText("Already in the family")).toBeInTheDocument();
});

test("FAM-06 a fixture request with discard opens on Discard changes?", async () => {
  renderSheet({ kind: "family", name: "Bao", discard: true });

  expect(await screen.findByRole("alert")).toHaveTextContent("Bao won’t be added.");
});

test("FAM-01 Done closes the sheet", async () => {
  renderSheet({ kind: "family" });

  await userEvent.click(await screen.findByRole("button", { name: "Done" }));

  expect(screen.getByLabelText("Open sheet")).toHaveTextContent("");
});
