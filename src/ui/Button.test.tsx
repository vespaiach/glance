import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "./Button";

test("spec§4.2 Button is a plain button that reports clicks", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Add note</Button>);

  const button = screen.getByRole("button", { name: "Add note" });
  await userEvent.click(button);

  expect(button).toHaveAttribute("type", "button");
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("spec§4.2 Button ignores clicks while disabled", async () => {
  const onClick = vi.fn();
  render(
    <Button onClick={onClick} disabled>
      Save
    </Button>,
  );

  const button = screen.getByRole("button", { name: "Save" });
  await userEvent.click(button);

  expect(button).toBeDisabled();
  expect(onClick).not.toHaveBeenCalled();
});

test("spec§4.2 Button puts icon before the label and iconRight after it", () => {
  render(
    <Button icon={Plus} iconRight={ArrowRight}>
      New event
    </Button>,
  );

  const button = screen.getByRole("button", { name: "New event" });
  const [first, , last] = Array.from(button.childNodes);

  expect(first?.nodeName.toLowerCase()).toBe("svg");
  expect(last?.nodeName.toLowerCase()).toBe("svg");
  expect(button.querySelectorAll("svg[aria-hidden='true']")).toHaveLength(2);
});

test("spec§4.2 Button passes extra button attributes through", () => {
  render(
    <Button type="submit" aria-describedby="hint">
      Send link
    </Button>,
  );

  const button = screen.getByRole("button", { name: "Send link" });

  expect(button).toHaveAttribute("type", "submit");
  expect(button).toHaveAttribute("aria-describedby", "hint");
});
