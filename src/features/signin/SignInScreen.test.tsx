import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Mock, vi } from "vitest";
import {
  type AuthStatus,
  type FixtureParams,
  fixtureSignIn,
  type SignedOutAccount,
  SignedOutAccountProvider,
  type SignInAuth,
  SignInAuthProvider,
} from "@/data/repos";
import { err, ok } from "@/domain/result";
import type { Account, WeatherLocation } from "@/domain/schemas";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
import { NowProvider } from "@/shell/providers/now";
import { SeasonProvider } from "@/shell/providers/season";
import { DefaultSettingsProvider } from "@/shell/providers/settings";
import { SignInScreen } from "./SignInScreen";

const navigation = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
  replace: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

const NOW = new Date(2026, 9, 9, 10, 41);

const MARIA: Account = fixtureSignIn;

type FakeAuth = {
  link: Mock<SignInAuth["link"]>;
  status: Mock<SignInAuth["status"]>;
  name: Mock<SignInAuth["name"]>;
  location: Mock<SignInAuth["location"]>;
  searchPlaces: Mock<SignInAuth["searchPlaces"]>;
  locate: Mock<SignInAuth["locate"]>;
  remember: Mock<SignInAuth["remember"]>;
};

const PORTLAND: WeatherLocation = {
  name: "Portland",
  region: "Oregon",
  lat: 45.52,
  lon: -122.68,
  timeZone: "America/Los_Angeles",
};

function fakeAuth(): FakeAuth {
  return {
    link: vi.fn<SignInAuth["link"]>(async () => ok(undefined)),
    status: vi.fn<SignInAuth["status"]>(async () => ok({ state: "waiting" })),
    name: vi.fn<SignInAuth["name"]>(async (name) => ok({ ...MARIA, name })),
    location: vi.fn<SignInAuth["location"]>(async () => ok(undefined)),
    searchPlaces: vi.fn<SignInAuth["searchPlaces"]>(async () => ok([PORTLAND])),
    locate: vi.fn<SignInAuth["locate"]>(async () => ok(PORTLAND)),
    remember: vi.fn<SignInAuth["remember"]>(async () => {}),
  };
}

const answer = (status: AuthStatus) => ok(status);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  navigation.push.mockClear();
  navigation.replace.mockClear();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function renderScreen(
  params: FixtureParams = {},
  auth: FakeAuth = fakeAuth(),
  signedOut?: SignedOutAccount,
) {
  render(
    <NowProvider frozenAt={NOW}>
      <DefaultSettingsProvider>
        <SeasonProvider>
          <FixtureParamsProvider params={params}>
            <SignInAuthProvider auth={auth}>
              <SignedOutAccountProvider account={signedOut}>
                <SignInScreen demo />
              </SignedOutAccountProvider>
            </SignInAuthProvider>
          </FixtureParamsProvider>
        </SeasonProvider>
      </DefaultSettingsProvider>
    </NowProvider>,
  );

  return auth;
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

async function sendLink(email: string) {
  const person = user();

  await person.type(screen.getByLabelText("Email"), email);
  await person.click(screen.getByRole("button", { name: "Send sign-in link" }));
}

test("SIGNIN-01 opens on the empty email form", () => {
  renderScreen();

  expect(screen.getByRole("heading", { name: "Sign in or get started" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("");
});

test("SIGNIN-13 a screen signed out by the server opens the form with its email and waiting count", () => {
  renderScreen({}, fakeAuth(), { email: MARIA.email, pending: 2 });

  expect(screen.getByRole("heading", { name: "Sign in again" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue(MARIA.email);
  expect(screen.getByText(/Changes waiting on this screen: 2\./)).toBeInTheDocument();
});

test("SIGNIN-13 Use a different email from Check your email keeps the signed-out notice", async () => {
  renderScreen({}, fakeAuth(), { email: MARIA.email, pending: 0 });

  await user().click(screen.getByRole("button", { name: "Send sign-in link" }));

  await user().click(await screen.findByRole("button", { name: "Use a different email" }));

  expect(screen.getByText("This screen was signed out")).toBeInTheDocument();
});

test("SIGNIN-02 an invalid email shows the error until the next keystroke", async () => {
  renderScreen();

  await sendLink("maria@example");

  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");

  await user().type(screen.getByLabelText("Email"), ".");

  expect(screen.getByLabelText("Email")).not.toHaveAccessibleDescription();
});

test("SIGNIN-03 a valid email moves to Sending", async () => {
  const auth = fakeAuth();

  auth.link.mockReturnValue(new Promise(() => {}));

  renderScreen({}, auth);

  await sendLink("maria@example.com");

  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
});

test("SIGNIN-03 Send asks for a link to the trimmed email with this screen's time zone", async () => {
  const auth = renderScreen();

  await sendLink(" maria@example.com ");

  expect(auth.link).toHaveBeenCalledExactlyOnceWith({
    email: "maria@example.com",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});

test("SIGNIN-04 the server accepting the link opens Check your email", async () => {
  renderScreen();

  await sendLink("maria@example.com");

  expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
});

test("SIGNIN-03 a failed send returns to the form with the email kept", async () => {
  const auth = fakeAuth();

  auth.link.mockResolvedValue(err("server"));

  renderScreen({}, auth);

  await sendLink("maria@example.com");

  expect(await screen.findByText("Couldn’t send. Try again.")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("maria@example.com");
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Couldn’t send. Try again.");
});

test("SIGNIN-04 the waiting screen polls the sign-in status every 2 s", async () => {
  const auth = renderScreen();

  await sendLink("maria@example.com");
  await screen.findByRole("heading", { name: "Check your email" });

  expect(auth.status).not.toHaveBeenCalled();

  await advance(2_000);

  expect(auth.status).toHaveBeenCalledTimes(1);

  await advance(2_000);

  expect(auth.status).toHaveBeenCalledTimes(2);
});

test("SIGNIN-04 Use a different email stops polling", async () => {
  const auth = renderScreen({ signin: "sent" });

  await user().click(screen.getByRole("button", { name: "Use a different email" }));
  await advance(4_000);

  expect(auth.status).not.toHaveBeenCalled();
});

test("SIGNIN-10 offline while waiting keeps Check your email and polls again", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValueOnce(err("network"));

  renderScreen({ signin: "sent" }, auth);

  await advance(2_000);

  expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();

  await advance(2_000);

  expect(auth.status).toHaveBeenCalledTimes(2);
});

test("SIGNIN-08 an expired link shows the expired waiting screen", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(answer({ state: "expired" }));

  renderScreen({ signin: "sent" }, auth);

  await advance(2_000);

  expect(screen.getByRole("heading", { name: "This link has expired" })).toBeInTheDocument();
});

test("SIGNIN-08 Send a new link sends again from the expired screen", async () => {
  const auth = renderScreen({ signin: "expired" });

  await user().click(screen.getByRole("button", { name: "Send a new link" }));

  expect(auth.link).toHaveBeenCalledWith(expect.objectContaining({ email: "maria@example.com" }));
  expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
});

test("SIGNIN-07 a link opened elsewhere on a new account shows Finish on your phone", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(answer({ state: "finishing-elsewhere" }));

  renderScreen({ signin: "sent" }, auth);

  await advance(2_000);

  expect(screen.getByRole("heading", { name: "Finish on your phone" })).toBeInTheDocument();
  expect(
    screen.getByText(
      "The link opened on another device. Add your name and this screen’s location there, and this screen signs in by itself.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Waiting for your phone")).toBeInTheDocument();

  await advance(2_000);

  expect(auth.status).toHaveBeenCalledTimes(2);
});

test("SIGNIN-09 signing in saves the account to glance-meta and opens Today after 2.2 s", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(
    answer({ state: "signed-in", account: MARIA, returning: true, setupDone: true }),
  );

  renderScreen({ signin: "sent" }, auth);

  await advance(2_000);

  expect(screen.getByRole("heading", { name: "Welcome back, Maria" })).toBeInTheDocument();
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);

  await advance(2_100);

  expect(navigation.replace).not.toHaveBeenCalled();

  await advance(100);

  expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/today");
});

function openLink(link: "opened" | "stale") {
  window.history.replaceState(null, "", `/signin?link=${link}`);
}

test("SIGNIN-09 the device that opened a returning account's link signs in and opens Today", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(
    answer({ state: "signed-in", account: MARIA, returning: true, setupDone: true }),
  );

  openLink("opened");

  renderScreen({}, auth);

  expect(await screen.findByRole("heading", { name: "Welcome back, Maria" })).toBeInTheDocument();
  expect(auth.status).toHaveBeenCalledOnce();
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);

  await advance(2_200);

  expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/today");
});

test("SIGNIN-06 the device that opened a new account's link asks for the name first", async () => {
  const auth = fakeAuth();

  const ana = { ...MARIA, email: "ana@example.com", name: null };

  auth.status.mockResolvedValue(
    answer({ state: "signed-in", account: ana, returning: false, setupDone: false }),
  );

  openLink("opened");

  renderScreen({}, auth);

  await user().type(await screen.findByLabelText("Your name"), "Ana");

  expect(auth.remember).not.toHaveBeenCalled();

  await user().click(screen.getByRole("button", { name: "Continue" }));

  expect(auth.name).toHaveBeenCalledExactlyOnceWith("Ana");
  expect(await screen.findByRole("heading", { name: "Where is this screen?" })).toBeInTheDocument();
});

test("SIGNIN-14 a returning sign-in whose location step never ended asks where the screen is", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(
    answer({ state: "signed-in", account: MARIA, returning: true, setupDone: false }),
  );

  openLink("opened");

  renderScreen({}, auth);

  expect(await screen.findByRole("heading", { name: "Where is this screen?" })).toBeInTheDocument();
  expect(auth.remember).not.toHaveBeenCalled();
});

test("SIGNIN-12 the device that opened a stale link offers a new one to its email", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(answer({ state: "expired", email: "maria@example.com" }));

  openLink("stale");

  renderScreen({}, auth);

  expect(
    await screen.findByRole("heading", { name: "This link doesn’t work anymore" }),
  ).toBeInTheDocument();

  await user().click(screen.getByRole("button", { name: "Send a new link" }));

  expect(auth.link).toHaveBeenCalledWith(expect.objectContaining({ email: "maria@example.com" }));
});

test("SIGNIN-10 a link check that can't reach the server opens the email form", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(err("network"));

  openLink("opened");

  renderScreen({}, auth);

  expect(
    await screen.findByRole("heading", { name: "Sign in or get started" }),
  ).toBeInTheDocument();
});

test("SIGNIN-09 signin=done is a snapshot and stays put", async () => {
  renderScreen({ signin: "done" });

  await advance(5_000);

  expect(navigation.replace).not.toHaveBeenCalled();
});

test("SIGNIN-06 Continue saves the trimmed name and asks where the screen is", async () => {
  const auth = renderScreen({ signin: "name" });

  const person = user();

  await person.type(screen.getByLabelText("Your name"), "  Ana Lee ");
  await person.click(screen.getByRole("button", { name: "Continue" }));

  expect(auth.name).toHaveBeenCalledExactlyOnceWith("Ana Lee");
  expect(await screen.findByRole("heading", { name: "Where is this screen?" })).toBeInTheDocument();
  expect(auth.remember).not.toHaveBeenCalled();
});

test("SIGNIN-14 signin=location opens Where is this screen? with Skip for now", () => {
  renderScreen({ signin: "location" });

  expect(screen.getByRole("heading", { name: "Where is this screen?" })).toBeInTheDocument();
  expect(screen.getByLabelText("City or ZIP code")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument();
});

test("SIGNIN-14 a found place is saved to the account, then Welcome opens Today", async () => {
  const auth = renderScreen({ signin: "location" });

  const person = user();

  await person.type(screen.getByLabelText("City or ZIP code"), "Portland, OR");
  await person.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(auth.searchPlaces).toHaveBeenCalledExactlyOnceWith("Portland, OR");
  expect(auth.location).toHaveBeenCalledExactlyOnceWith({ place: PORTLAND });
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);

  await advance(2_200);

  expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/today");
});

test("SIGNIN-14 Skip for now ends the step and welcomes the account", async () => {
  const auth = renderScreen({ signin: "location" });

  await user().click(screen.getByRole("button", { name: "Skip for now" }));

  expect(await screen.findByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(auth.location).toHaveBeenCalledExactlyOnceWith({ skip: true });
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);
});

test("SIGNIN-14 a failed save keeps the place and Continue saves it again", async () => {
  const auth = fakeAuth();

  auth.location.mockResolvedValueOnce(err("network"));

  renderScreen({ signin: "location" }, auth);

  const person = user();

  await person.type(screen.getByLabelText("City or ZIP code"), "Portland, OR");
  await person.click(screen.getByRole("button", { name: "Continue" }));

  expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
    "Couldn’t save. Try again.",
  );
  expect(screen.getByLabelText("City or ZIP code")).toHaveValue("Portland, OR");

  await person.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(auth.searchPlaces).toHaveBeenCalledOnce();
  expect(auth.location).toHaveBeenLastCalledWith({ place: PORTLAND });
});

test("SIGNIN-14 a failed skip says so and Skip for now tries again", async () => {
  const auth = fakeAuth();

  auth.location.mockResolvedValueOnce(err("network"));

  renderScreen({ signin: "location" }, auth);

  const person = user();

  await person.click(screen.getByRole("button", { name: "Skip for now" }));

  expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
    "Couldn’t save. Try again.",
  );

  await person.click(screen.getByRole("button", { name: "Skip for now" }));

  expect(await screen.findByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(auth.location).toHaveBeenCalledTimes(2);
});

test("SIGNIN-06 a failed name save keeps the name step and says so", async () => {
  const auth = fakeAuth();

  auth.name.mockResolvedValue(err("network"));

  renderScreen({ signin: "name" }, auth);

  const person = user();

  await person.type(screen.getByLabelText("Your name"), "Ana");
  await person.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByText("Couldn’t save. Try again.")).toBeInTheDocument();
  expect(screen.getByLabelText("Your name")).toHaveValue("Ana");
});

test("SIGNIN-04 [Mock] I opened the link with the fixture email welcomes Maria back", async () => {
  const auth = renderScreen({ signin: "sent" });

  await user().click(screen.getByRole("button", { name: "I opened the link" }));

  expect(await screen.findByRole("heading", { name: "Welcome back, Maria" })).toBeInTheDocument();
  expect(auth.remember).toHaveBeenCalledWith(MARIA);
});

test("SIGNIN-06 [Mock] I opened the link with a new email asks for a name", async () => {
  renderScreen();

  await sendLink("ana@example.com");
  await user().click(await screen.findByRole("button", { name: "I opened the link" }));

  expect(screen.getByRole("heading", { name: "What’s your name?" })).toBeInTheDocument();
  expect(screen.getByText("ana@example.com")).toBeInTheDocument();
});

test("SIGNIN-07 [Mock] I finished on my phone welcomes the new account", async () => {
  const auth = renderScreen({ signin: "phone" });

  await user().click(screen.getByRole("button", { name: "I finished on my phone" }));

  expect(await screen.findByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(auth.remember).toHaveBeenCalledWith(MARIA);
});

test("SIGNIN-04 signin=sent opens Check your email for the fixture account", () => {
  renderScreen({ signin: "sent" });

  expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
  expect(screen.getByText("maria@example.com")).toBeInTheDocument();
});

test("SIGNIN-05 Continue as guests opens Today", async () => {
  renderScreen();

  await user().click(screen.getByRole("button", { name: "Continue as guests" }));

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
