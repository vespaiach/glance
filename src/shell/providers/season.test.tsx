import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, openHarness } from "@/data/repos/testHarness";
import { SeasonProvider, useSeason } from "./season";
import { type ShellOptions, shellWrapper } from "./testShell";

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-season-provider-test");
});

afterEach(async () => {
  vi.useRealTimers();

  await store.close();
});

function SeasonName() {
  return <p>{useSeason()}</p>;
}

function renderSeason(options: ShellOptions = {}, children: ReactNode = <SeasonName />) {
  const Shell = shellWrapper(store, options);

  return render(
    <Shell>
      <SeasonProvider>{children}</SeasonProvider>
    </Shell>,
  );
}

describe("SeasonProvider", () => {
  it("SET-02 Auto follows the month and marks the root", async () => {
    const { container } = renderSeason({ frozenAt: new Date("2026-10-09T10:41:00") });

    expect(await screen.findByText("fall")).toBeInTheDocument();
    expect(container.querySelector("[data-season]")).toHaveAttribute("data-season", "fall");
  });

  it("SET-02 a fixed season ignores the month", async () => {
    await createSettingsRepo(store).update({ season: "spring" });

    renderSeason({ frozenAt: new Date("2026-10-09T10:41:00") });

    expect(await screen.findByText("spring")).toBeInTheDocument();
  });

  it("SET-02 the fixture season overrides the setting", async () => {
    renderSeason({ frozenAt: new Date("2026-10-09T10:41:00"), overrides: { season: "summer" } });

    expect(await screen.findByText("summer")).toBeInTheDocument();
  });

  it("TIME-02 Auto re-checks at midnight", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-30T23:59:58"), shouldAdvanceTime: true });

    renderSeason();

    expect(await screen.findByText("fall")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));

    await waitFor(() => expect(screen.getByText("winter")).toBeInTheDocument());
  });
});
