import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { AllDayTile, AllDayTiles } from "./AllDayTile";

const noSchool = {
  label: "All day",
  title: "No school · teacher planning day",
  who: "Minh-An, Minh-Hy",
  location: "Lincoln Elementary",
  dot: "soft",
} as const;

const MOM: Tag = {
  id: "0195f0a0-0000-7000-8000-000000000501",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
};

const allDay = (n: number, who: Pick<CalendarEvent, "everyone" | "tagIds">): CalendarEvent => ({
  id: `0195f0a0-0000-7000-8000-00000000001${n}`,
  title: `Plan ${n}`,
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  location: "Home",
  notify: true,
  ...who,
});

test("TODAY-12 AllDayTile shows All day, the title and {who} · {place}", () => {
  render(<AllDayTile {...noSchool} onClick={() => {}} />);

  expect(screen.getByRole("button")).toHaveTextContent(
    "All dayNo school · teacher planning dayMinh-An, Minh-Hy · Lincoln Elementary",
  );
});

test("TODAY-12 AllDayTile with no place shows only who", () => {
  render(<AllDayTile {...noSchool} location={undefined} onClick={() => {}} />);

  expect(screen.getByRole("button")).toHaveTextContent(
    "All dayNo school · teacher planning dayMinh-An, Minh-Hy",
  );
});

test("TODAY-12 AllDayTiles read who from the family, or Everyone", () => {
  render(
    <AllDayTiles
      events={[
        allDay(1, { everyone: false, tagIds: [MOM.id] }),
        allDay(2, { everyone: true, tagIds: [] }),
      ]}
      tags={[MOM]}
      label="All day"
      everyoneLabel="Everyone"
      onOpenEvent={() => {}}
    />,
  );

  const [mom, everyone] = screen.getAllByRole("button");

  expect(mom).toHaveTextContent("Mom · Home");
  expect(everyone).toHaveTextContent("Everyone · Home");
});

test("TODAY-12 tapping an AllDayTile opens it", async () => {
  const onClick = vi.fn<() => void>();

  render(<AllDayTile {...noSchool} onClick={onClick} />);

  await userEvent.click(screen.getByRole("button"));

  expect(onClick).toHaveBeenCalledTimes(1);
});

test("STATUS-01 an AllDayTile is never struck through", () => {
  render(<AllDayTile {...noSchool} onClick={() => {}} />);

  expect(screen.getByText(noSchool.title).tagName).not.toBe("S");
});
