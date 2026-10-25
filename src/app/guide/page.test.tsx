import { render, screen } from "@testing-library/react";
import GuidePage from "./page";

test("GUIDE-01 /guide renders signed out, with no providers", () => {
  render(<GuidePage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Your family’s day, at a glance." }),
  ).toBeInTheDocument();
});
