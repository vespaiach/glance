import { act, renderHook, waitFor } from "@testing-library/react";
import { ok } from "@/domain/result";
import { UPDATE_CHECK_MS } from "./serviceWorker";
import { type Harness, openHarness, wrapperFor } from "./testHarness";
import { useServerVersion } from "./version";

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-version-repo-test");
});

afterEach(async () => {
  vi.useRealTimers();
  await store.close();
});

test("SET-21 reads the server's version", async () => {
  store.serverVersion.mockResolvedValue(ok("1.2.0"));

  const { result } = renderHook(() => useServerVersion(), { wrapper: wrapperFor(store) });

  await waitFor(() => expect(result.current).toBe("1.2.0"));
});

test("SET-21 reads it again at the hourly update check", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  store.serverVersion.mockResolvedValueOnce(ok("1.2.0")).mockResolvedValueOnce(ok("1.3.0"));

  const { result } = renderHook(() => useServerVersion(), { wrapper: wrapperFor(store) });

  await vi.waitFor(() => expect(result.current).toBe("1.2.0"));

  await act(() => vi.advanceTimersByTimeAsync(UPDATE_CHECK_MS));

  expect(result.current).toBe("1.3.0");
});

test("SET-21 an unreachable server leaves the version unknown", async () => {
  const { result } = renderHook(() => useServerVersion(), { wrapper: wrapperFor(store) });

  await waitFor(() => expect(store.serverVersion).toHaveBeenCalled());
  expect(result.current).toBeUndefined();
});
