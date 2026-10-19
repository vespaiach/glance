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

test("PHOTO-12 TextInput shows a caption beside its label, outside the field's name", () => {
  render(<TextInput label="Place" caption="Not in photo" value="" onChange={() => {}} />);

  expect(screen.getByRole("textbox", { name: "Place" })).toBeInTheDocument();
  expect(screen.getByText("Not in photo")).toBeInTheDocument();
});

test("PHOTO-12 TextInput can be a date field with a latest day", () => {
  render(
    <TextInput
      label="Date taken"
      type="date"
      max="2026-10-09"
      value="2025-10-31"
      onChange={() => {}}
    />,
  );

  const field = screen.getByLabelText("Date taken");

  expect(field).toHaveAttribute("type", "date");
  expect(field).toHaveAttribute("max", "2026-10-09");
  expect(field).toHaveValue("2025-10-31");
});

test("spec§4.2 TextInput without an error is not marked invalid", () => {
  render(<TextInput label="Email" value="" onChange={() => {}} />);

  const input = screen.getByRole("textbox", { name: "Email" });

  expect(input).not.toHaveAttribute("aria-invalid");
  expect(input).not.toHaveAttribute("aria-describedby");
});

describe("Return", () => {
  it("KB-04 in a single-line field moves to the next field", async () => {
    render(
      <div role="dialog">
        <TextInput label="Title" value="" onChange={() => {}} />
        <button type="button">Starts</button>
        <TextInput label="Where" value="" onChange={() => {}} />
      </div>,
    );

    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "{Enter}");

    expect(screen.getByRole("textbox", { name: "Where" })).toHaveFocus();
  });

  it("KB-04 in a multiline field adds a line", async () => {
    const onChange = vi.fn();
    render(
      <div role="dialog">
        <TextInput label="Message" value="Hi" onChange={onChange} multiline />
        <TextInput label="Name" value="" onChange={() => {}} />
      </div>,
    );

    const message = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(message, "{Enter}");

    expect(message).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("Hi\n");
  });

  it("KB-04 in the last field of a form submits it", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <TextInput label="Email" value="" onChange={() => {}} />
        <button type="submit">Send</button>
      </form>,
    );

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("KB-04 in the last field of a sheet hides the keyboard", async () => {
    render(
      <div role="dialog">
        <TextInput label="Message" value="" onChange={() => {}} multiline />
        <TextInput label="Name" value="" onChange={() => {}} />
      </div>,
    );

    const name = screen.getByRole("textbox", { name: "Name" });
    await userEvent.type(name, "{Enter}");

    expect(name).not.toHaveFocus();
  });
});

test("A11Y a TextInput without a visible label is named by ariaLabel", () => {
  render(<TextInput ariaLabel="Name" placeholder="Name" value="" onChange={() => {}} />);

  expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-label", "Name");
});
