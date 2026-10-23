import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StickyNote } from "./StickyNote";

test("spec§4.2 StickyNote shows its message, author and time", () => {
  render(
    <StickyNote author="Maria" time="Just now">
      Soccer practice moved to 5
    </StickyNote>,
  );

  expect(screen.getByText("Soccer practice moved to 5")).toBeInTheDocument();
  expect(screen.getByText("Maria")).toBeInTheDocument();
  expect(screen.getByText("Just now")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("NOTE-01 StickyNote with onClick is a button that reports taps", async () => {
  const onClick = vi.fn();
  render(
    <StickyNote author="Leo" time="Tue" rotate={1.5} onClick={onClick}>
      Feed the cat
    </StickyNote>,
  );

  const note = screen.getByRole("button", { name: /Feed the cat/ });
  await userEvent.click(note);

  expect(note).toHaveAttribute("type", "button");
  expect(onClick).toHaveBeenCalledTimes(1);
});
