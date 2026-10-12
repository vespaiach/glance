import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, openHarness } from "@/data/repos/testHarness";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { useAccountSettings } from "./settings";
import { shellWrapper } from "./testShell";

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-settings-provider-test");
});

afterEach(() => store.close());

describe("SettingsProvider", () => {
  it("SET-02 gives the saved settings and follows changes", async () => {
    const { result } = renderHook(() => useAccountSettings(), { wrapper: shellWrapper(store) });

    await waitFor(() => expect(result.current).toEqual(DEFAULT_SETTINGS));

    await act(() => createSettingsRepo(store).update({ season: "winter" }));

    await waitFor(() => expect(result.current.season).toBe("winter"));
  });

  it("TIME-03 fixture overrides win over the saved row", async () => {
    await createSettingsRepo(store).update({ clock: "12h", season: "fall" });

    const { result } = renderHook(() => useAccountSettings(), {
      wrapper: shellWrapper(store, { overrides: { clock: "24h" } }),
    });

    await waitFor(() => expect(result.current).toMatchObject({ clock: "24h", season: "fall" }));
  });

  it("tech§4.3 renders nothing until the settings are read", async () => {
    const Wrapper = shellWrapper(store);

    render(
      <Wrapper>
        <p>ready</p>
      </Wrapper>,
    );

    expect(screen.queryByText("ready")).toBeNull();

    expect(await screen.findByText("ready")).toBeInTheDocument();
  });
});
