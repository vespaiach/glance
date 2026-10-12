import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, openHarness } from "@/data/repos/testHarness";
import type { AccountSettings } from "@/domain/schemas";
import { SheetHost, useSheetHost } from "../SheetHost";
import { IdleProvider } from "./idle";
import { shellWrapper } from "./testShell";

const navigation = vi.hoisted(() => ({
  pathname: "/calendar",
  push: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-idle-provider-test");

  navigation.pathname = "/calendar";
  navigation.push.mockReset();
});

afterEach(async () => {
  vi.useRealTimers();

  await store.close();
});

function SheetProbe() {
  const { sheet, open } = useSheetHost();

  return (
    <>
      <p>{sheet === null ? "no sheet" : sheet.kind}</p>
      <button type="button" onClick={() => open({ kind: "newnote" })}>
        open
      </button>
      <input aria-label="Title" />
    </>
  );
}

async function renderIdle(start: string, settings: Partial<AccountSettings> = {}) {
  await createSettingsRepo(store).update({ idleTimeout: 60, ...settings });

  vi.useFakeTimers({ now: new Date(`2026-10-09T${start}`), shouldAdvanceTime: true });

  const Shell = shellWrapper(store);

  const tree = () => (
    <Shell>
      <SheetHost>
        <IdleProvider>
          <SheetProbe />
        </IdleProvider>
      </SheetHost>
    </Shell>
  );

  const { rerender } = render(tree());

  await screen.findByText("no sheet");

  return (pathname: string) => {
    navigation.pathname = pathname;
    rerender(tree());
  };
}

const seconds = (n: number) => act(() => vi.advanceTimersByTime(n * 1000));

describe("IdleProvider", () => {
  it("IDLE-01 returns to Today and discards the sheet after no touch for the timeout", async () => {
    await renderIdle("10:41:00");

    fireEvent.click(screen.getByRole("button", { name: "open" }));

    expect(screen.getByText("newnote")).toBeInTheDocument();

    seconds(59);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/today");
    expect(screen.getByText("no sheet")).toBeInTheDocument();
  });

  it("IDLE-01 a touch restarts the timer", async () => {
    await renderIdle("10:41:00");

    seconds(50);

    fireEvent.pointerDown(document.body);

    seconds(50);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(10);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("IDLE-01 stays on Today when it is already there", async () => {
    navigation.pathname = "/today";

    await renderIdle("10:41:00");

    seconds(120);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("IDLE-01 Never turns the timeout off", async () => {
    await renderIdle("10:41:00", { idleTimeout: null });

    seconds(600);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("IDLE-02 pauses while a text field is focused", async () => {
    await renderIdle("10:41:00");

    act(() => screen.getByRole("textbox", { name: "Title" }).focus());

    seconds(300);

    expect(navigation.push).not.toHaveBeenCalled();

    act(() => screen.getByRole("textbox", { name: "Title" }).blur());

    seconds(59);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("IDLE-03 returns to Ambient during ambient hours", async () => {
    navigation.pathname = "/today";

    await renderIdle("21:00:00");

    seconds(60);

    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });

  it("AMB-05 enters Ambient at the schedule start", async () => {
    navigation.pathname = "/today";

    await renderIdle("17:59:30", { idleTimeout: null });

    seconds(29);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });

  it("AMB-05 leaves Ambient for Today at the schedule end", async () => {
    navigation.pathname = "/ambient";

    await renderIdle("07:29:30", { idleTimeout: null });

    seconds(30);

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/today"));
  });

  it("AMB-05 the schedule end leaves other views alone", async () => {
    navigation.pathname = "/calendar";

    await renderIdle("07:29:30", { idleTimeout: null });

    seconds(30);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("IDLE-03 after a wake tap during ambient hours, idle returns to Ambient", async () => {
    navigation.pathname = "/ambient";

    const showPath = await renderIdle("21:00:00");

    seconds(30);

    fireEvent.pointerDown(document.body);

    showPath("/today");

    seconds(59);

    expect(navigation.push).not.toHaveBeenCalled();

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });

  it("SET-06 a previewed Ambient returns to Today after the idle timeout outside ambient hours", async () => {
    navigation.pathname = "/ambient";

    await renderIdle("10:41:00");

    seconds(60);

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("AMB-05 the schedule start goes to Ambient once when idle is due at the same moment", async () => {
    navigation.pathname = "/today";

    await renderIdle("17:59:00");

    seconds(60);

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("/ambient");
  });
});
