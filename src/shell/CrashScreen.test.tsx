import { act, fireEvent, render, screen } from "@testing-library/react";
import { CrashScreen } from "./CrashScreen";

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderCrash() {
  const report = vi.fn();

  const reload = vi.fn();

  const error = new Error("render failed");

  const view = render(<CrashScreen error={error} report={report} reload={reload} />);

  return { report, reload, error, view };
}

function wait(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

describe("CrashScreen", () => {
  it("FAIL-04 reports page-crashed once", () => {
    const { report, error, view } = renderCrash();

    view.rerender(<CrashScreen error={error} report={report} reload={vi.fn()} />);

    wait(3);

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith("page-crashed", error, {});
  });

  it("FAIL-04 reports the digest of a server render error", () => {
    const report = vi.fn();

    const error = Object.assign(new Error("render failed"), { digest: "1234567890" });

    render(<CrashScreen error={error} report={report} reload={vi.fn()} />);

    expect(report).toHaveBeenCalledWith("page-crashed", error, { digest: "1234567890" });
  });

  it("FAIL-04 shows the message and counts down from 60 s", () => {
    renderCrash();

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("Glance will reload in 60 s.")).toBeInTheDocument();

    wait(15);

    expect(screen.getByText("Glance will reload in 45 s.")).toBeInTheDocument();
  });

  it("FAIL-04 reloads on its own at 0", () => {
    const { reload } = renderCrash();

    wait(59);

    expect(reload).not.toHaveBeenCalled();

    wait(1);

    expect(screen.getByText("Glance will reload in 0 s.")).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("FAIL-04 Reload reloads at once", () => {
    const { reload } = renderCrash();

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("FAIL-04 the third crash within 10 minutes stops the countdown and waits for Reload", () => {
    crashAndReload();
    crashAndReload();

    const { reload } = renderCrash();

    expect(
      screen.getByText("Glance keeps running into this problem. Tap Reload to try again."),
    ).toBeInTheDocument();

    wait(120);

    expect(reload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("FAIL-04 a crash 10 minutes after the earlier ones counts down again", () => {
    crashAndReload();
    crashAndReload();

    wait(600);

    const { reload } = renderCrash();

    expect(screen.getByText("Glance will reload in 60 s.")).toBeInTheDocument();

    wait(60);

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

function crashAndReload() {
  const { view } = renderCrash();

  wait(60);

  view.unmount();
}
