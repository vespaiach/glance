import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllDayTile } from "./AllDayTile";

const noSchool = {
  label: "All day",
  title: "No school · teacher planning day",
  location: "Lincoln Elementary",
  dot: 4,
} as const;

test("TODAY-12 AllDayTile shows All day, the title and the place", () => {
  render(<AllDayTile {...noSchool} onClick={() => {}} />);

  expect(screen.getByRole("button")).toHaveTextContent(
    "All dayNo school · teacher planning dayLincoln Elementary",
  );
});

test("TODAY-12 AllDayTile with no place shows only the title", () => {
  render(<AllDayTile {...noSchool} location={undefined} onClick={() => {}} />);

  expect(screen.getByRole("button")).toHaveTextContent("All dayNo school · teacher planning day");
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
