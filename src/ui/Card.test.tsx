import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card } from "./Card";

test("spec§4.2 Card shows its eyebrow, title and content", () => {
  render(
    <Card eyebrow="Account" title="Maria">
      maria@example.com
    </Card>,
  );

  expect(screen.getByText("Account")).toBeInTheDocument();
  expect(screen.getByText("Maria")).toBeInTheDocument();
  expect(screen.getByText("maria@example.com")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("spec§4.2 Card with onClick is a button that reports taps", async () => {
  const onClick = vi.fn();
  render(<Card title="Upload family photos" onClick={onClick} />);

  const card = screen.getByRole("button", { name: "Upload family photos" });
  await userEvent.click(card);

  expect(card).toHaveAttribute("type", "button");
  expect(onClick).toHaveBeenCalledTimes(1);
});
