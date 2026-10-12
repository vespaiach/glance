import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tone } from "@/domain/schemas";
import { ColorSwatchPicker } from "./ColorSwatchPicker";

const options: { value: Tone; label: string }[] = [
  { value: 1, label: "Lime" },
  { value: 2, label: "Pink" },
  { value: "accent", label: "Alert" },
];

test("A11Y ColorSwatchPicker swatches are named by color and pressed when selected", () => {
  render(<ColorSwatchPicker label="Color" options={options} value={2} onChange={() => {}} />);

  expect(screen.getByRole("group", { name: "Color" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pink" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Lime" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Alert" })).toHaveAttribute("aria-pressed", "false");
});

test("spec§4.2 ColorSwatchPicker reports the tone of the tapped swatch", async () => {
  const onChange = vi.fn();
  render(<ColorSwatchPicker label="Color" options={options} value={2} onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "Alert" }));

  expect(onChange).toHaveBeenCalledWith("accent");
});
