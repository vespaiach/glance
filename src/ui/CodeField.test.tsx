import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeField } from "./CodeField";

test("SIGNIN-04 CodeField is one numeric one-time-code input named by its label", () => {
  render(<CodeField label="Code" value="" onChange={() => {}} />);

  const input = screen.getByRole("textbox", { name: "Code" });

  expect(input).toHaveAttribute("inputmode", "numeric");
  expect(input).toHaveAttribute("autocomplete", "one-time-code");
  expect(input).not.toHaveAttribute("maxlength");
});

test("SIGNIN-04 CodeField shows each digit in its own cell", () => {
  const { container } = render(<CodeField label="Code" value="482" onChange={() => {}} />);

  const cells = [...container.querySelectorAll("[aria-hidden='true']")].map(
    (cell) => cell.textContent,
  );

  expect(cells).toEqual(["4", "8", "2", "", "", ""]);
});

test("SIGNIN-04 pasting reports the pasted text as typed", async () => {
  const onChange = vi.fn();

  render(<CodeField label="Code" value="" onChange={onChange} />);

  await userEvent.click(screen.getByRole("textbox", { name: "Code" }));
  await userEvent.paste("482 913");

  expect(onChange).toHaveBeenLastCalledWith("482 913");
});

test("SIGNIN-04 autoFocus puts the caret in the field when it opens", () => {
  render(<CodeField label="Code" value="" onChange={() => {}} autoFocus />);

  expect(screen.getByRole("textbox", { name: "Code" })).toHaveFocus();
});

test("SIGNIN-17 an error marks the field invalid and describes it", () => {
  render(
    <CodeField
      label="Code"
      value=""
      onChange={() => {}}
      error="That code isn’t right. Try again."
    />,
  );

  const input = screen.getByRole("textbox", { name: "Code" });

  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription("That code isn’t right. Try again.");
  expect(screen.getByRole("alert")).toHaveTextContent("That code isn’t right. Try again.");
});

test("SIGNIN-04 a busy field is read-only and keeps its focus", () => {
  render(<CodeField label="Code" value="482913" onChange={() => {}} busy autoFocus />);

  const input = screen.getByRole("textbox", { name: "Code" });

  expect(input).toHaveAttribute("readonly");
  expect(input).toHaveFocus();
});

test("SIGNIN-17 a disabled field takes no digits", async () => {
  const onChange = vi.fn();

  render(<CodeField label="Code" value="" onChange={onChange} disabled />);

  await userEvent.type(screen.getByRole("textbox", { name: "Code" }), "4");

  expect(screen.getByRole("textbox", { name: "Code" })).toBeDisabled();
  expect(onChange).not.toHaveBeenCalled();
});
