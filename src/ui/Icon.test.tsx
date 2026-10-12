import { render } from "@testing-library/react";
import { House } from "lucide-react";
import { Icon } from "./Icon";

function renderSvg(element: React.ReactElement) {
  const { container } = render(element);
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return svg;
}

test("spec§4.1 Icon is decorative and hidden from assistive tech", () => {
  const svg = renderSvg(<Icon icon={House} />);

  expect(svg).toHaveAttribute("aria-hidden", "true");
});

test("spec§4.1 Icon defaults to 24 px with a 1.75 stroke and round caps", () => {
  const svg = renderSvg(<Icon icon={House} />);

  expect(svg).toHaveAttribute("width", "24");
  expect(svg).toHaveAttribute("height", "24");
  expect(svg).toHaveAttribute("stroke-width", "1.75");
  expect(svg).toHaveAttribute("stroke-linecap", "round");
  expect(svg).toHaveAttribute("stroke", "currentColor");
});

test("spec§4.1 Icon keeps the 1.75 stroke just below 48 px", () => {
  const svg = renderSvg(<Icon icon={House} size={47} />);

  expect(svg).toHaveAttribute("stroke-width", "1.75");
});

test("spec§4.1 Icon thins the stroke to 1.5 at 48 px and above", () => {
  const svg = renderSvg(<Icon icon={House} size={48} />);

  expect(svg).toHaveAttribute("width", "48");
  expect(svg).toHaveAttribute("stroke-width", "1.5");
});

test("spec§4.1 Icon accepts a stroke override for large weather glyphs", () => {
  const svg = renderSvg(<Icon icon={House} size={96} strokeWidth={1.25} />);

  expect(svg).toHaveAttribute("stroke-width", "1.25");
});
