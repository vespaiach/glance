import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TextInput } from "./TextInput";

function Controlled({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <TextInput
      label="Title"
      value={value}
      placeholder="What's happening?"
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

test("spec§4.2 TextInput is named by its label and reports the typed text", async () => {
  const onChange = vi.fn();
  render(<Controlled onChange={onChange} />);

  const input = screen.getByRole("textbox", { name: "Title" });
  await userEvent.type(input, "Swim");

  expect(input).toHaveValue("Swim");
  expect(input).toHaveAttribute("placeholder", "What's happening?");
  expect(onChange).toHaveBeenLastCalledWith("Swim");
});

test("spec§4.2 TextInput renders a textarea with the given rows when multiline", () => {
  render(<TextInput label="Note" value="" onChange={() => {}} multiline rows={4} />);

  const textarea = screen.getByRole("textbox", { name: "Note" });

  expect(textarea.tagName).toBe("TEXTAREA");
  expect(textarea).toHaveAttribute("rows", "4");
});

test("spec§4.2 TextInput shows the error below and marks the field invalid", () => {
  render(<TextInput label="Email" value="x" onChange={() => {}} error="Check the email" />);

  const input = screen.getByRole("textbox", { name: "Email" });

  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Check the email");
});

test("spec§4.2 TextInput without an error is not marked invalid", () => {
  render(<TextInput label="Email" value="" onChange={() => {}} />);

  const input = screen.getByRole("textbox", { name: "Email" });

  expect(input).not.toHaveAttribute("aria-invalid");
  expect(input).not.toHaveAttribute("aria-describedby");
});
