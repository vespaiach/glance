import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useAmbientNavigate, useAmbientRoot } from "./useAmbientNavigate";

const navigation = vi.hoisted(() => ({ pathname: "/today", push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

type Running = { finish: () => void };

let animate: ReturnType<typeof vi.fn>;

let running: Running[];

let reduced: boolean;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  navigation.pathname = "/today";
  navigation.push.mockReset();
  reduced = false;
  running = [];
  animate = vi.fn(() => {
    let finish = () => {};
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    running.push({ finish });
    return { finished, cancel: vi.fn() };
  });
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" && reduced,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(async () => {
  await finishAll();
  act(() => vi.runOnlyPendingTimers());
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
  vi.unstubAllGlobals();
});

function Root({ path, onTap = () => {} }: { path: string; onTap?: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  const navigate = useAmbientNavigate();

  useAmbientRoot(root, path);

  return (
    <div ref={root}>
      <div data-backdrop="photo" />
      <span>row one</span>
      <span>row two</span>
      <button type="button" onClick={() => navigate("/ambient")}>
        Ambient
      </button>
      <button type="button" onClick={onTap}>
        Tap
      </button>
    </div>
  );
}

async function finishAll() {
  await act(async () => {
    for (const animation of running.splice(0)) animation.finish();
  });
}

test("AMB-10 navigation to Ambient pushes only after the leave half", async () => {
  render(<Root path="/today" />);

  fireEvent.click(screen.getByRole("button", { name: "Ambient" }));

  expect(navigation.push).not.toHaveBeenCalled();
  expect(animate).toHaveBeenCalledOnce();

  await finishAll();

  expect(navigation.push).toHaveBeenCalledWith("/ambient");
});

test("AMB-10 taps and further navigations are ignored mid-transition", async () => {
  const onTap = vi.fn();
  render(<Root path="/today" onTap={onTap} />);
  fireEvent.click(screen.getByRole("button", { name: "Ambient" }));

  fireEvent.pointerDown(screen.getByRole("button", { name: "Tap" }));
  fireEvent.click(screen.getByRole("button", { name: "Tap" }));
  fireEvent.click(screen.getByRole("button", { name: "Ambient" }));

  expect(onTap).not.toHaveBeenCalled();
  expect(animate).toHaveBeenCalledOnce();
});

test("AMB-10 the arriving root runs the enter half, then taps work again", async () => {
  const onTap = vi.fn();
  const view = render(<Root path="/today" onTap={onTap} />);
  fireEvent.click(screen.getByRole("button", { name: "Ambient" }));
  await finishAll();
  animate.mockClear();

  navigation.pathname = "/ambient";
  view.rerender(<Root key="ambient" path="/ambient" onTap={onTap} />);

  expect(animate).toHaveBeenCalledTimes(5);
  fireEvent.click(screen.getByRole("button", { name: "Tap" }));
  expect(onTap).not.toHaveBeenCalled();

  await finishAll();
  fireEvent.click(screen.getByRole("button", { name: "Tap" }));

  expect(onTap).toHaveBeenCalledOnce();
});

test("AMB-10 leaving Ambient animates its rows, not the backdrop", async () => {
  navigation.pathname = "/ambient";
  render(<Root path="/ambient" />);
  const navigate = vi.fn();
  function Wake() {
    const go = useAmbientNavigate();
    navigate.mockImplementation(go);
    return null;
  }
  render(<Wake />);

  act(() => navigate("/today"));

  expect(animate).toHaveBeenCalledTimes(4);
  await finishAll();
  expect(navigation.push).toHaveBeenCalledWith("/today");
});

test("AMB-10 reduced motion pushes at once and animates nothing", () => {
  reduced = true;
  render(<Root path="/today" />);

  fireEvent.click(screen.getByRole("button", { name: "Ambient" }));

  expect(navigation.push).toHaveBeenCalledWith("/ambient");
  expect(animate).not.toHaveBeenCalled();
});

test("AMB-10 a browser without the Web Animations API pushes at once", () => {
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
  render(<Root path="/today" />);

  fireEvent.click(screen.getByRole("button", { name: "Ambient" }));

  expect(navigation.push).toHaveBeenCalledWith("/ambient");
});

test("AMB-10 a move between views pushes at once", () => {
  function Views() {
    const navigate = useAmbientNavigate();
    return (
      <button type="button" onClick={() => navigate("/calendar")}>
        Calendar
      </button>
    );
  }
  render(<Views />);

  fireEvent.click(screen.getByRole("button", { name: "Calendar" }));

  expect(navigation.push).toHaveBeenCalledWith("/calendar");
  expect(animate).not.toHaveBeenCalled();
});
