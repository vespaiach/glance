import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarGrip } from "./SidebarGrip";

test("SHELL-09 the grip is named Show sidebar and is not expanded", () => {
  render(<SidebarGrip shown onShow={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Show sidebar" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("SHELL-08 tapping the grip asks to show the rail", async () => {
  const onShow = vi.fn();

  render(<SidebarGrip shown onShow={onShow} />);

  await userEvent.click(screen.getByRole("button", { name: "Show sidebar" }));

  expect(onShow).toHaveBeenCalledOnce();
});

test("SHELL-08 the grip is hidden while the rail or the drawer shows", () => {
  render(<SidebarGrip shown={false} onShow={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Show sidebar" })).not.toBeInTheDocument();
});

test("SHELL-11 the grip takes no focus when it comes back", () => {
  const { rerender } = render(<SidebarGrip shown onShow={vi.fn()} />);

  rerender(<SidebarGrip shown={false} onShow={vi.fn()} />);
  rerender(<SidebarGrip shown onShow={vi.fn()} />);

  expect(document.body).toHaveFocus();
});

test("SHELL-08 on a phone the grip is named Open menu", () => {
  render(<SidebarGrip shown phone onShow={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
