import { render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { usePageTransition } from "./usePageTransition";

function Page({ path }: { path: string }) {
  const main = usePageTransition<HTMLElement>(path);

  return <main ref={main} data-testid="page" />;
}

let animate: ReturnType<typeof vi.fn>;

let reduced: boolean;

beforeEach(() => {
  reduced = false;
  animate = vi.fn(() => ({ cancel: vi.fn() }));
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" && reduced,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
  vi.unstubAllGlobals();
});

test("tech§4.4 the incoming page animates after a view change", () => {
  const view = render(<Page path="/today" />);
  animate.mockClear();

  view.rerender(<Page path="/calendar" />);

  expect(animate).toHaveBeenCalledWith(
    [
      { opacity: 0, transform: "translateX(32px)" },
      { opacity: 1, transform: "none" },
    ],
    { duration: 280, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  );
});

test("tech§4.4 a view change while an animation runs cancels it first", () => {
  const view = render(<Page path="/today" />);
  const running = { cancel: vi.fn() };
  animate.mockReturnValueOnce(running);
  view.rerender(<Page path="/calendar" />);

  view.rerender(<Page path="/weather" />);

  expect(running.cancel).toHaveBeenCalledOnce();
});

test("tech§4.4 reduced motion skips the animation", () => {
  reduced = true;
  const view = render(<Page path="/today" />);
  animate.mockClear();

  view.rerender(<Page path="/calendar" />);

  expect(animate).not.toHaveBeenCalled();
});

test("tech§4.4 a browser without the Web Animations API still changes view", () => {
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
  const view = render(<Page path="/today" />);

  expect(() => view.rerender(<Page path="/calendar" />)).not.toThrow();
});

test("tech§4.4 a view change resets the page scroll before animating", () => {
  const view = render(<Page path="/today" />);
  const page = view.getByTestId("page");
  let top = 240;
  Object.defineProperty(page, "scrollTop", {
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });

  view.rerender(<Page path="/calendar" />);

  expect(top).toBe(0);
});
