import { act, renderHook, waitFor } from "@testing-library/react";
import { type Harness, openHarness } from "@/data/repos/testHarness";
import { ok } from "@/domain/result";
import { shellWrapper } from "@/shell/providers/testShell";
import { useQrTile } from "./useQrTile";

const START = new Date("2026-10-09T17:41:00.000Z");

const LINKS = ["https://g.example/v?t=1", "https://g.example/v?t=2", "https://g.example/v?t=3"];

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-qr-tile-test");

  vi.useFakeTimers({ now: START, shouldAdvanceTime: true });

  let issued = 0;
  store.issueQr.mockImplementation(async () => ok({ url: LINKS[issued++] ?? "" }));
  store.voidQr.mockImplementation(async () => ok(undefined));
});

afterEach(async () => {
  vi.useRealTimers();

  await store.close();
});

async function renderTile(opens?: "import") {
  const rendered = renderHook(() => useQrTile(opens), { wrapper: shellWrapper(store) });

  await waitFor(() => expect(rendered.result.current).not.toBeNull());

  return rendered;
}

async function shown(result: { current: ReturnType<typeof useQrTile> }) {
  act(() => result.current.show());

  await waitFor(() => expect(result.current.tile.kind).toBe("open"));
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useQrTile", () => {
  it("SIGNIN-15 Sign in another device issues a code and starts at 3:00", async () => {
    const { result } = await renderTile();

    await shown(result);

    expect(result.current.tile).toMatchObject({ kind: "open", url: LINKS[0] });
    expect(result.current.secondsLeft).toBe(180);
    expect(store.issueQr).toHaveBeenCalledTimes(1);
  });

  it("IMP-04 an import code starts at 10:00 and is renewed at 0:00", async () => {
    const { result } = await renderTile("import");
    await shown(result);

    expect(result.current.secondsLeft).toBe(600);
    expect(store.issueQr).toHaveBeenCalledWith("import");

    await advance(600_000);

    await waitFor(() => expect(result.current.tile).toMatchObject({ url: LINKS[1] }));
    expect(result.current.secondsLeft).toBe(600);
  });

  it("IMP-04 New code replaces the open code and restarts the countdown", async () => {
    const { result } = await renderTile("import");
    await shown(result);
    await advance(65_000);

    act(() => result.current.renew());

    await waitFor(() => expect(result.current.tile).toMatchObject({ url: LINKS[1] }));
    expect(result.current.secondsLeft).toBe(600);
  });

  it("SIGNIN-15 counts down each second", async () => {
    const { result } = await renderTile();
    await shown(result);

    await advance(65_000);

    expect(result.current.secondsLeft).toBe(115);
  });

  it("SIGNIN-15 at 0:00 a new code replaces it and the countdown restarts at 3:00", async () => {
    const { result } = await renderTile();
    await shown(result);

    await advance(180_000);

    await waitFor(() => expect(result.current.tile).toMatchObject({ url: LINKS[1] }));
    expect(result.current.secondsLeft).toBe(180);
    expect(store.issueQr).toHaveBeenCalledTimes(2);
  });

  it("SIGNIN-15 Done closes the tile, voids the code and stops the countdown", async () => {
    const { result } = await renderTile();
    await shown(result);

    act(() => result.current.close());
    await advance(180_000);

    expect(result.current.tile).toEqual({ kind: "closed" });
    expect(store.voidQr).toHaveBeenCalledWith(LINKS[0]);
    expect(store.issueQr).toHaveBeenCalledTimes(1);
  });

  it("SIGNIN-15 leaving Settings voids the open code", async () => {
    const { result, unmount } = await renderTile();
    await shown(result);

    unmount();

    expect(store.voidQr).toHaveBeenCalledWith(LINKS[0]);
  });

  it("SIGNIN-15 a code that arrives after Done is voided", async () => {
    let answer: (url: string) => void = () => {};
    store.issueQr.mockImplementation(
      () => new Promise((resolve) => (answer = (url) => resolve(ok({ url })))),
    );
    const { result } = await renderTile();
    act(() => result.current.show());

    act(() => result.current.close());
    await act(async () => answer(LINKS[0] ?? ""));

    expect(result.current.tile).toEqual({ kind: "closed" });
    await waitFor(() => expect(store.voidQr).toHaveBeenCalledWith(LINKS[0]));
  });

  it("SIGNIN-15 a code that can't be made shows the failure, and Try again asks again", async () => {
    store.issueQr.mockResolvedValueOnce({ ok: false, error: "network" });
    const { result } = await renderTile();

    act(() => result.current.show());
    await waitFor(() => expect(result.current.tile).toEqual({ kind: "failed" }));
    await shown(result);

    expect(store.issueQr).toHaveBeenCalledTimes(2);
  });
});
