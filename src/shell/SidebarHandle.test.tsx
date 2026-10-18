import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarHandle } from "./SidebarHandle";

test.each([
  [false, "false"],
  [true, "true"],
])("SHELL-09 Expand menu with the drawer open %s has aria-expanded %s", (expanded, value) => {
  render(<SidebarHandle shown expanded={expanded} onOpen={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Expand menu" })).toHaveAttribute(
    "aria-expanded",
    value,
  );
});

test("SHELL-08 tapping Expand menu asks to expand the sidebar", async () => {
  const onOpen = vi.fn();

  render(<SidebarHandle shown expanded={false} onOpen={onOpen} />);

  await userEvent.click(screen.getByRole("button", { name: "Expand menu" }));

  expect(onOpen).toHaveBeenCalledOnce();
});

test("SHELL-08 the handle is gone while the sidebar is hidden", () => {
  render(<SidebarHandle shown={false} expanded={false} onOpen={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Expand menu" })).not.toBeInTheDocument();
});

test("SHELL-09 the handle is inert while the drawer is open", () => {
  const { rerender } = render(<SidebarHandle shown expanded onOpen={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Expand menu" })).toHaveAttribute("inert");

  rerender(<SidebarHandle shown expanded={false} onOpen={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Expand menu" })).not.toHaveAttribute("inert");
});
