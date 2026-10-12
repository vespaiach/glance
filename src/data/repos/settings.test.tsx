import { act, renderHook, waitFor } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { createSettingsRepo, useSettings } from "./settings";
import {
  type Harness,
  openHarness,
  synced,
  TEST_ACCOUNT,
  TEST_NOW,
  wrapperFor,
} from "./testHarness";

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-settings-repo-test");
});

afterEach(() => store.close());

describe("settings repo", () => {
  it("tech§4.2 update merges the change into the row and queues the whole row", async () => {
    await store.db.settings.put({ ...synced(DEFAULT_SETTINGS, 4), accountId: TEST_ACCOUNT });

    await createSettingsRepo(store).update({ clock: "24h" });

    const row = {
      ...DEFAULT_SETTINGS,
      clock: "24h",
      accountId: TEST_ACCOUNT,
      updatedAt: "2026-10-01T09:00:00.000Z",
      version: 4,
    };

    expect(await store.db.settings.get(TEST_ACCOUNT)).toEqual(row);
    expect(await store.db.outbox.toArray()).toEqual([
      { seq: 1, entity: "settings", entityId: TEST_ACCOUNT, op: "put", payload: row, attempts: 0 },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("tech§4.3 update with no saved row starts from the defaults", async () => {
    await createSettingsRepo(store).update({ tempUnit: "C" });

    expect(await store.db.settings.get(TEST_ACCOUNT)).toEqual({
      ...DEFAULT_SETTINGS,
      tempUnit: "C",
      accountId: TEST_ACCOUNT,
      updatedAt: TEST_NOW.toISOString(),
      version: 0,
    });
  });
});

describe("useSettings", () => {
  it("tech§4.3 reads the defaults when no row exists, then the saved row", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current).toEqual(DEFAULT_SETTINGS));

    await act(() => createSettingsRepo(store).update({ clock: "24h" }));

    await waitFor(() => expect(result.current).toEqual({ ...DEFAULT_SETTINGS, clock: "24h" }));
  });
});
