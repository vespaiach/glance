import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FixtureParams } from "@/data/repos";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
import { NowProvider } from "@/shell/providers/now";
import { SeasonProvider } from "@/shell/providers/season";
import { DefaultSettingsProvider } from "@/shell/providers/settings";
import { SignInScreen } from "./SignInScreen";

const navigation = vi.hoisted(() => ({ push: vi.fn<(path: string) => void>() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));

const NOW = new Date(2026, 9, 9, 10, 41);

beforeEach(() => {
  navigation.push.mockClear();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderScreen(params: FixtureParams = {}) {
  render(
    <NowProvider frozenAt={NOW}>
      <DefaultSettingsProvider>
        <SeasonProvider>
          <FixtureParamsProvider params={params}>
            <SignInScreen demo />
          </FixtureParamsProvider>
        </SeasonProvider>
      </DefaultSettingsProvider>
    </NowProvider>,
  );
}

test("SIGNIN-01 opens on the empty email form", () => {
  renderScreen();

  expect(screen.getByRole("heading", { name: "Sign in or get started" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("");
});

test("SIGNIN-02 an invalid email shows the error until the next keystroke", async () => {
  renderScreen();

  await userEvent.type(screen.getByLabelText("Email"), "maria@example");
  await userEvent.click(screen.getByRole("button", { name: "Send sign-in link" }));

  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");

  await userEvent.type(screen.getByLabelText("Email"), ".");

  expect(screen.getByLabelText("Email")).not.toHaveAccessibleDescription();
});

test("SIGNIN-03 a valid email moves to Sending", async () => {
  renderScreen();

  await userEvent.type(screen.getByLabelText("Email"), "maria@example.com");
  await userEvent.click(screen.getByRole("button", { name: "Send sign-in link" }));

  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
});

test("SIGNIN-04 signin=sent opens Check your email for the fixture account", () => {
  renderScreen({ signin: "sent" });

  expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
  expect(screen.getByText("maria@example.com")).toBeInTheDocument();
});

test("SIGNIN-05 Continue as demo opens Today", async () => {
  renderScreen();

  await userEvent.click(screen.getByRole("button", { name: "Continue as demo" }));

  expect(navigation.push).toHaveBeenCalledWith("/today");
});

test("SIGNIN-10 signin=offline shows the offline form", () => {
  renderScreen({ signin: "offline" });

  expect(screen.getByText("You’re offline")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();
});

test("SIGNIN-10 the browser going offline disables sending", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

  renderScreen();

  expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();

  vi.restoreAllMocks();
});
