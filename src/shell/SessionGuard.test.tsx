import { render, screen, waitFor } from "@testing-library/react";
import type { SyncStatus } from "@/data/repos";
import { type Harness, openHarness, putSyncStatus, wrapperFor } from "@/data/repos/testHarness";
import { SessionGuard } from "./SessionGuard";

const navigation = vi.hoisted(() => ({ replace: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: navigation.replace }) }));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-session-guard-test");

  navigation.replace.mockReset();
});

afterEach(async () => {
  await store.close();
});

function failedWith(error: SyncStatus["error"]): SyncStatus {
  return { online: true, weather: { state: "idle" }, error };
}

function renderGuard() {
  const Repos = wrapperFor(store);

  render(
    <Repos>
      <SessionGuard>
        <p>view</p>
      </SessionGuard>
    </Repos>,
  );
}

describe("SessionGuard", () => {
  it("SIGNIN-13 a session the server stopped accepting returns the screen to Sign in", async () => {
    await putSyncStatus(store, failedWith("unauthorized"));

    renderGuard();

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));
  });

  it("SIGNIN-13 the 401 arriving while the view is open returns to Sign in", async () => {
    renderGuard();

    expect(await screen.findByText("view")).toBeInTheDocument();

    await putSyncStatus(store, failedWith("unauthorized"));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));
  });

  it.each(["server", "outdated"] as const)(
    "tech§4.6 a %s failure keeps the view",
    async (error) => {
      await putSyncStatus(store, failedWith(error));

      renderGuard();

      expect(await screen.findByText("view")).toBeInTheDocument();
      expect(navigation.replace).not.toHaveBeenCalled();
    },
  );
});
