import { render, screen, waitFor } from "@testing-library/react";
import { DisplayProviders } from "./DisplayProviders";
import { useSeason } from "./providers/season";

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

test("tech§4.5 a signed-out screen goes to Sign in and shows no view", async () => {
  render(
    <DisplayProviders>
      <SeasonProbe />
    </DisplayProviders>,
  );

  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/signin"));

  expect(screen.queryByText(/season/)).not.toBeInTheDocument();
});
