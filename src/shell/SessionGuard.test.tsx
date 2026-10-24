import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SyncStatus } from "@/data/repos";
import { type Harness, openHarness, putSyncStatus, wrapperFor } from "@/data/repos/testHarness";
import { SessionGuard } from "./SessionGuard";
import { SheetHost, useSheetHost } from "./SheetHost";

const navigation = vi.hoisted(() => ({
  pathname: "/today",
  replace: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-session-guard-test");

  navigation.pathname = "/today";
  navigation.replace.mockReset();
});

afterEach(async () => {
  await store.close();
});

function failedWith(error: SyncStatus["error"]): SyncStatus {
  return { online: true, weather: { state: "idle" }, error };
}

function SheetProbe() {
  const { sheet, open, close } = useSheetHost();

  return (
    <>
      <p>{sheet === null ? "no sheet" : sheet.kind}</p>
      <button type="button" onClick={() => open({ kind: "newnote" })}>
        open
      </button>
      <button type="button" onClick={close}>
        close
      </button>
      <input aria-label="Title" />
    </>
  );
}

function renderGuard() {
  const Repos = wrapperFor(store);

  render(
    <Repos>
      <SheetHost>
        <SessionGuard>
          <SheetProbe />
        </SessionGuard>
      </SheetHost>
    </Repos>,
  );
}

const signedOutByServer = () => act(() => putSyncStatus(store, failedWith("unauthorized")));

describe("SessionGuard", () => {
  it("SIGNIN-13 a session the server stopped accepting returns the screen to Sign in", async () => {
    await putSyncStatus(store, failedWith("unauthorized"));

    renderGuard();

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));
  });

  it("SIGNIN-13 the 401 arriving while the view is open returns to Sign in", async () => {
    renderGuard();

    expect(await screen.findByText("no sheet")).toBeInTheDocument();

    await signedOutByServer();

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));
  });

  it("SIGNIN-13 marks this screen signed out before it leaves for Sign in", async () => {
    let markedFirst = false;

    navigation.replace.mockImplementation(() => {
      markedFirst = store.markSignedOut.mock.calls.length > 0;
    });

    renderGuard();

    await signedOutByServer();

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));

    expect(markedFirst).toBe(true);
  });

  it("SIGNIN-13 an open sheet stays until it closes, then the form shows", async () => {
    renderGuard();

    fireEvent.click(await screen.findByRole("button", { name: "open" }));

    await signedOutByServer();

    await waitFor(() => expect(store.markSignedOut).toHaveBeenCalled());

    expect(screen.getByText("newnote")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "close" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));
  });

  it("SIGNIN-13 a focused text field stays until it loses focus", async () => {
    renderGuard();

    const field = await screen.findByLabelText("Title");

    act(() => field.focus());

    await signedOutByServer();

    await waitFor(() => expect(store.markSignedOut).toHaveBeenCalled());

    expect(navigation.replace).not.toHaveBeenCalled();

    act(() => field.blur());

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));
  });

  it("AMB-07 Ambient stays when the server signs the screen out", async () => {
    navigation.pathname = "/ambient";

    renderGuard();

    await signedOutByServer();

    await waitFor(() => expect(store.markSignedOut).toHaveBeenCalled());

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("SIGNIN-18 a revoked screen is marked revoked, not signed out, then returns to Sign in", async () => {
    let markedFirst = false;

    navigation.replace.mockImplementation(() => {
      markedFirst = store.markRevoked.mock.calls.length > 0;
    });

    renderGuard();

    await act(() => putSyncStatus(store, failedWith("revoked")));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));

    expect(markedFirst).toBe(true);
    expect(store.markSignedOut).not.toHaveBeenCalled();
  });

  it("SIGNIN-18 a revoked screen waits for an open sheet to close", async () => {
    renderGuard();

    fireEvent.click(await screen.findByRole("button", { name: "open" }));

    await act(() => putSyncStatus(store, failedWith("revoked")));

    await waitFor(() => expect(store.markRevoked).toHaveBeenCalled());

    expect(navigation.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "close" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));
  });

  it.each(["server", "outdated"] as const)(
    "tech§4.6 a %s failure keeps the view",
    async (error) => {
      await putSyncStatus(store, failedWith(error));

      renderGuard();

      expect(await screen.findByText("no sheet")).toBeInTheDocument();
      expect(navigation.replace).not.toHaveBeenCalled();
      expect(store.markSignedOut).not.toHaveBeenCalled();
    },
  );
});
