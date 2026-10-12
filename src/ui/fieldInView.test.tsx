import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useFieldInView } from "./fieldInView";

function Area({ inset }: { inset: number }) {
  const area = useRef<HTMLDivElement>(null);

  useFieldInView(area, inset);

  return (
    <div ref={area} data-testid="area">
      <label htmlFor="first">First</label>
      <input id="first" />
      <button type="button">Go</button>
    </div>
  );
}

function place(element: Element, top: number) {
  element.getBoundingClientRect = () => ({ top }) as DOMRect;
}

function setUp(inset: number) {
  const view = render(<Area inset={inset} />);

  const area = screen.getByTestId("area");

  area.scrollTop = 50;
  place(area, 100);
  place(screen.getByText("First"), 400);

  return { ...view, area };
}

test("KB-03 with the keyboard up, focusing a field scrolls its label 24 px below the top of the area", () => {
  const { area } = setUp(300);

  screen.getByRole("textbox", { name: "First" }).focus();

  expect(area.scrollTop).toBe(50 + 400 - 100 - 24);
});

test("KB-03 a keyboard opening under a focused field scrolls it into view", () => {
  const { area, rerender } = setUp(0);

  screen.getByRole("textbox", { name: "First" }).focus();

  expect(area.scrollTop).toBe(50);

  rerender(<Area inset={300} />);

  expect(area.scrollTop).toBe(326);
});

test("KB-03 with no keyboard, focusing a field leaves the scroll alone", () => {
  const { area } = setUp(0);

  screen.getByRole("textbox", { name: "First" }).focus();

  expect(area.scrollTop).toBe(50);
});

test("KB-03 focusing a button does not scroll", () => {
  const { area } = setUp(300);

  screen.getByRole("button", { name: "Go" }).focus();

  expect(area.scrollTop).toBe(50);
});
