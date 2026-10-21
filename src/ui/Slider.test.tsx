import { fireEvent, render, screen } from "@testing-library/react";
import { Slider } from "./Slider";

function renderSlider(overrides: { disabled?: boolean; onChange?: (value: number) => void } = {}) {
  render(
    <Slider
      label="Minutes before going back to Today"
      min={1}
      max={15}
      value={3}
      valueText="3 min"
      minLabel="1 min"
      maxLabel="15 min"
      onChange={overrides.onChange ?? (() => {})}
      disabled={overrides.disabled}
    />,
  );

  return screen.getByRole("slider", { name: "Minutes before going back to Today" });
}

test("SET-07 Slider is a named slider with its range, value and value text", () => {
  const slider = renderSlider();

  expect(slider).toHaveAttribute("min", "1");
  expect(slider).toHaveAttribute("max", "15");
  expect(slider).toHaveValue("3");
  expect(slider).toHaveAttribute("aria-valuetext", "3 min");
  expect(slider).toBeEnabled();
});

test("SET-07 Slider shows the end labels", () => {
  renderSlider();

  expect(screen.getByText("1 min")).toBeInTheDocument();
  expect(screen.getByText("15 min")).toBeInTheDocument();
});

test("SET-07 moving the slider reports the number", () => {
  const onChange = vi.fn();
  const slider = renderSlider({ onChange });

  fireEvent.change(slider, { target: { value: "9" } });

  expect(onChange).toHaveBeenCalledWith(9);
});

test("SET-07 a disabled slider can't be moved", () => {
  const slider = renderSlider({ disabled: true });

  expect(slider).toBeDisabled();
});
