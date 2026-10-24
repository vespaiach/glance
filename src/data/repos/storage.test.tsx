import { renderHook, waitFor } from "@testing-library/react";
import { usePhotoUsage } from "./storage";
import { type Harness, openHarness, wrapperFor } from "./testHarness";

const USAGE = { used: 3_200_000_000, limit: 5_000_000_000 };

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-storage-repo-test");
});

afterEach(async () => {
  await store.close();
});

describe("usePhotoUsage", () => {
  it("SET-13 reads the account's photo storage from the server once", async () => {
    store.photoUsage.mockResolvedValue({ ok: true, value: USAGE });

    const { result } = renderHook(() => usePhotoUsage(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current).toEqual(USAGE));
    expect(store.photoUsage).toHaveBeenCalledOnce();
  });

  it("SET-13 has no usage while it loads", () => {
    store.photoUsage.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePhotoUsage(), { wrapper: wrapperFor(store) });

    expect(result.current).toBeUndefined();
  });

  it.each(["network", "server"] as const)(
    "SET-13 has no usage when the read fails with %s",
    async (error) => {
      store.photoUsage.mockResolvedValue({ ok: false, error });

      const { result } = renderHook(() => usePhotoUsage(), { wrapper: wrapperFor(store) });

      await waitFor(() => expect(store.photoUsage).toHaveBeenCalled());
      expect(result.current).toBeUndefined();
    },
  );
});
