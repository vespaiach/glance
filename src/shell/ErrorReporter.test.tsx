import { render } from "@testing-library/react";
import { ErrorReporter } from "./ErrorReporter";

function sentEvents(fetch: ReturnType<typeof vi.fn>) {
  return fetch.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

describe("ErrorReporter", () => {
  it("tech§6.6 reports the window's uncaught errors and rejections as uncaught", () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetch);

    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    const view = render(<ErrorReporter>page</ErrorReporter>);

    window.dispatchEvent(new ErrorEvent("error", { error: new TypeError("window boom") }));

    const rejection = new Event("unhandledrejection");

    Object.assign(rejection, { reason: "rejected boom" });

    window.dispatchEvent(rejection);

    view.unmount();

    window.dispatchEvent(new ErrorEvent("error", { error: new TypeError("after unmount") }));

    expect(sentEvents(fetch)).toEqual([
      expect.objectContaining({
        event: "uncaught",
        page: "/",
        error: expect.objectContaining({ name: "TypeError", message: "window boom" }),
      }),
      expect.objectContaining({
        event: "uncaught",
        error: { name: "Error", message: "rejected boom" },
      }),
    ]);
  });
});
