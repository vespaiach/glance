import { renderHook, waitFor } from "@testing-library/react";
import { fixtureScreens } from "@/fixtures/data";
import { useSignedInScreens } from "./screens";
import { type Harness, openHarness, TEST_NOW, wrapperFor } from "./testHarness";

const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1";

const THIS_SCREEN_ONLY = [
  {
    id: "this-screen",
    kind: "tablet",
    browser: "Safari",
    lastSeenAt: TEST_NOW.toISOString(),
    current: true,
  },
];

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-screens-repo-test");
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(IPAD);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await store.close();
});

describe("useSignedInScreens", () => {
  it("SET-12 reads the account's screens from the server once", async () => {
    store.displays.mockResolvedValue({ ok: true, value: fixtureScreens(TEST_NOW) });

    const { result } = renderHook(() => useSignedInScreens(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current).toEqual(fixtureScreens(TEST_NOW)));
    expect(store.displays).toHaveBeenCalledOnce();
  });

  it("SET-12 shows only this screen while the list loads", () => {
    store.displays.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSignedInScreens(), { wrapper: wrapperFor(store) });

    expect(result.current).toEqual(THIS_SCREEN_ONLY);
  });

  it.each(["network", "server"] as const)(
    "SET-12 shows only this screen when the read fails with %s",
    async (error) => {
      store.displays.mockResolvedValue({ ok: false, error });

      const { result } = renderHook(() => useSignedInScreens(), { wrapper: wrapperFor(store) });

      await waitFor(() => expect(store.displays).toHaveBeenCalled());
      expect(result.current).toEqual(THIS_SCREEN_ONLY);
    },
  );
});
