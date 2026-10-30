import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useFieldInView } from "./fieldInView";

const viewport = Object.assign(new EventTarget(), { offsetTop: 0, height: 500 });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("visualViewport", viewport);
  viewport.height = 500;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Area({ inset }: { inset: number }) {
  const area = useRef<HTMLDivElement>(null);

  const padding = useFieldInView(area, inset);

  return (
    <div ref={area} data-testid="area" data-padding={padding}>
      <label htmlFor="first">First</label>
      <input id="first" />
      <button type="button">Go</button>
    </div>
  );
}

function place(element: Element, top: number, bottom = top + 40) {
  element.getBoundingClientRect = () => ({ top, bottom, height: bottom - top }) as DOMRect;
}

function setUp(inset = 300) {
  const view = render(<Area inset={inset} />);

  const area = screen.getByTestId("area");

  const field = screen.getByRole("textbox", { name: "First" });

  area.scrollTop = 50;
  place(area, 0, 800);
  place(screen.getByText("First"), 560, 580);
  place(field, 600, 650);

  return { ...view, area, field };
}

function limitScroll(area: HTMLElement, max: number) {
  let top = 0;

  Object.defineProperty(area, "scrollTop", {
    get: () => top,
    set: (value: number) => {
      top = Math.max(0, Math.min(max, value));
    },
  });
}

test("KB-03 focusing a field below the keyboard scrolls the scroll area until it sits 16 px above it", () => {
  const { area, field } = setUp();

  field.focus();

  expect(area.scrollTop).toBe(50 + 650 - 484);
});

test("KB-03 the scroll area scrolls first and the rest goes to the window", () => {
  const { area, field } = setUp();
  const scrollBy = vi.fn();
  vi.stubGlobal("scrollBy", scrollBy);
  limitScroll(area, 100);
  area.scrollTop = 50;

  field.focus();

  expect(area.scrollTop).toBe(100);
  expect(scrollBy).toHaveBeenCalledWith(0, 166 - 50);
});

test("KB-03 focusing reveals the field again 350 ms later", () => {
  const { area, field } = setUp();

  field.focus();
  place(field, 700, 750);
  act(() => vi.advanceTimersByTime(350));

  expect(area.scrollTop).toBe(50 + 166 + 266);
});

test("KB-03 a visualViewport resize keeps the focused field above the keyboard", () => {
  const { area, field } = setUp();

  field.focus();
  place(field, 434, 484);
  viewport.height = 400;
  act(() => {
    viewport.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(16);
  });

  expect(area.scrollTop).toBe(50 + 166 + 100);
});

test("KB-03 focusing a button does not scroll", () => {
  const { area } = setUp();

  screen.getByRole("button", { name: "Go" }).focus();

  expect(area.scrollTop).toBe(50);
});

test("KB-03 the scroll area is padded by the keyboard only while a field has focus", () => {
  const { area, field } = setUp();

  expect(area.dataset.padding).toBe("0");

  act(() => field.focus());

  expect(area.dataset.padding).toBe("300");

  act(() => field.blur());

  expect(area.dataset.padding).toBe("0");
});

test("KB-02 a field lands 12 px below the area's scroll padding, so a sticky bar does not cover it", () => {
  const { area, field } = setUp();
  area.style.scrollPaddingTop = "64px";
  place(screen.getByText("First"), 40, 60);
  place(field, 70, 110);

  field.focus();

  expect(area.scrollTop).toBe(50 + 40 - 64 - 12);
});

test("KB-02 a field lands below a page top bar that wrapped taller than the scroll padding", () => {
  const { area, field } = setUp();
  const bar = document.createElement("div");
  bar.dataset.pageTopBar = "";
  bar.getBoundingClientRect = () => ({ height: 159 }) as DOMRect;
  area.prepend(bar);
  area.style.scrollPaddingTop = "88px";
  place(screen.getByText("First"), 140, 160);
  place(field, 170, 210);

  field.focus();

  expect(area.scrollTop).toBe(50 + 140 - 159 - 12);
});
