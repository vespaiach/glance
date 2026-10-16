import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "lucide-react";
import { IconButton } from "./IconButton";

test("A11Y IconButton is named by its label and reports clicks", async () => {
  const onClick = vi.fn();
  render(<IconButton icon={Settings} label="Settings" onClick={onClick} />);

  await userEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(onClick).toHaveBeenCalledTimes(1);
});

test("A11Y IconButton hides its glyph from assistive tech", () => {
  render(<IconButton icon={Settings} label="Settings" />);

  const button = screen.getByRole("button", { name: "Settings" });

  expect(button).toHaveAttribute("type", "button");
  expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("spec§4.2 IconButton sizes its glyph to 45% of the button", () => {
  render(<IconButton icon={Settings} label="Settings" size="touch" />);

  const svg = screen.getByRole("button", { name: "Settings" }).querySelector("svg");

  expect(svg).toHaveAttribute("width", "25");
});

test("A11Y IconButton with current marks itself as the current page", () => {
  render(<IconButton icon={Settings} label="Settings" active current="page" />);

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
});

test("A11Y-02 IconButton with active reports its pressed state", () => {
  render(
    <>
      <IconButton icon={Settings} label="On" active />
      <IconButton icon={Settings} label="Off" active={false} />
      <IconButton icon={Settings} label="Plain" />
    </>,
  );

  expect(screen.getByRole("button", { name: "On" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Plain" })).not.toHaveAttribute("aria-pressed");
});

test("SHELL-09 IconButton reports whether what it opens is expanded", () => {
  const { rerender } = render(<IconButton icon={Settings} label="Open" expanded={false} />);

  expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-expanded", "false");

  rerender(<IconButton icon={Settings} label="Open" />);

  expect(screen.getByRole("button", { name: "Open" })).not.toHaveAttribute("aria-expanded");
});
