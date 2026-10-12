import { renderHook, waitFor } from "@testing-library/react";
import { FIXTURE_WEATHER } from "@/fixtures/data";
import { type Harness, openHarness, TEST_ACCOUNT, wrapperFor } from "./testHarness";
import { useWeather } from "./weather";

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-weather-repo-test");
});

afterEach(() => store.close());

describe("useWeather", () => {
  it("WX-06 reads null with no saved forecast, then the forecast the sync engine saves", async () => {
    const { result } = renderHook(() => useWeather(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current).toBeNull());

    await store.db.weather.put({ ...FIXTURE_WEATHER, accountId: TEST_ACCOUNT });

    await waitFor(() => expect(result.current).toEqual(FIXTURE_WEATHER));
  });

  it("tech§4.1 ignores another account's forecast", async () => {
    await store.db.weather.put({ ...FIXTURE_WEATHER, accountId: "someone-else" });

    const { result } = renderHook(() => useWeather(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current).toBeNull());
  });
});
