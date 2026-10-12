import { render, screen, waitFor } from "@testing-library/react";
import { DisplayProviders } from "./DisplayProviders";
import { useSeason } from "./providers/season";
import { useTimeZone } from "./providers/timeZone";

const navigation = vi.hoisted(() => ({
  replace: vi.fn<(path: string) => void>(),
  push: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

beforeEach(() => {
  navigation.replace.mockReset();
});

function SeasonProbe() {
  return <p>season {useSeason()}</p>;
}

function ZoneProbe() {
  return <p>zone {useTimeZone()}</p>;
}

test("tech§4.5 a signed-out screen goes to Sign in and shows no view", async () => {
  render(
    <DisplayProviders demo={false}>
      <SeasonProbe />
    </DisplayProviders>,
  );

  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));

  expect(screen.queryByText(/season/)).not.toBeInTheDocument();
});

test("tech§6.5 a demo build shows the view with fixture params applied", async () => {
  window.history.replaceState(null, "", "/today?season=winter");

  render(
    <DisplayProviders demo>
      <SeasonProbe />
    </DisplayProviders>,
  );

  expect(await screen.findByText("season winter")).toBeInTheDocument();
  expect(navigation.replace).not.toHaveBeenCalled();

  window.history.replaceState(null, "", "/");
});

test("LOC-06 a demo display follows the fixture place's zone, not the device's", async () => {
  window.history.replaceState(null, "", "/today");

  render(
    <DisplayProviders demo>
      <ZoneProbe />
    </DisplayProviders>,
  );

  expect(await screen.findByText("zone America/Los_Angeles")).toBeInTheDocument();

  window.history.replaceState(null, "", "/");
});
