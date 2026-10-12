import { render, screen } from "@testing-library/react";
import { TopBar } from "./TopBar";

test("spec§4.2 TopBar shows the brand with its center and right slots", () => {
  render(<TopBar brand="Glance" center={<span>Tabs</span>} right={<span>Settings</span>} />);

  expect(screen.getByText("Glance")).toBeInTheDocument();
  expect(screen.getByText("Tabs")).toBeInTheDocument();
  expect(screen.getByText("Settings")).toBeInTheDocument();
});

test("SHELL-01 TopBar with an empty brand renders only its slots", () => {
  const { container } = render(<TopBar brand="" right={<span>Nav</span>} />);

  expect(container.textContent).toBe("Nav");
});
