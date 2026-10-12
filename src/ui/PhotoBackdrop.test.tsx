import { render } from "@testing-library/react";
import { PhotoBackdrop } from "./PhotoBackdrop";

const COAST = 'url("/photos/coast.jpg")';

const BIKES = 'url("/photos/bikes.jpg")';

function layers(container: HTMLElement): string[] {
  return [...container.querySelectorAll("[data-backdrop]")].map(
    (layer) => layer.getAttribute("data-backdrop") ?? "",
  );
}

test("BG-06 PhotoBackdrop paints the photo as one hidden layer", () => {
  const { container } = render(<PhotoBackdrop image={COAST} />);

  expect(layers(container)).toEqual([COAST]);
  expect(container.querySelector("[data-backdrop]")).toHaveAttribute("aria-hidden", "true");
});

test("BG-06 a new photo fades in over the previous one", () => {
  const { container, rerender } = render(<PhotoBackdrop image={COAST} />);

  rerender(<PhotoBackdrop image={BIKES} />);

  expect(layers(container)).toEqual([COAST, BIKES]);
});

test("BG-06 only the last two photos stay mounted", () => {
  const { container, rerender } = render(<PhotoBackdrop image={COAST} />);

  rerender(<PhotoBackdrop image={BIKES} />);
  rerender(<PhotoBackdrop image={COAST} />);

  expect(layers(container)).toEqual([BIKES, COAST]);
});

test("BG-06 switching to Season color fades the last photo out", () => {
  const { container, rerender } = render(<PhotoBackdrop image={COAST} />);

  rerender(<PhotoBackdrop image={undefined} />);

  expect(layers(container)).toEqual([COAST]);
});

test("BG-06 Season color with no earlier photo paints nothing", () => {
  const { container } = render(<PhotoBackdrop image={undefined} />);

  expect(layers(container)).toEqual([]);
});
