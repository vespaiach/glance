import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Mock, vi } from "vitest";
import {
  type AuthStatus,
  type SignedOutAccount,
  SignedOutAccountProvider,
  type SignInAuth,
  SignInAuthProvider,
} from "@/data/repos";
import { err, ok } from "@/domain/result";
import type { Account, WeatherLocation } from "@/domain/schemas";
import { NowProvider } from "@/shell/providers/now";
import { SeasonProvider } from "@/shell/providers/season";
import { DefaultSettingsProvider } from "@/shell/providers/settings";
import { SignInScreen } from "./SignInScreen";

const navigation = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
  replace: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/signin",
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

const NOW = new Date(2026, 9, 9, 10, 41);

const MARIA: Account = { id: "a-maria", email: "maria@example.com", name: "Maria" };

type FakeAuth = {
  sendCode: Mock<SignInAuth["sendCode"]>;
  verifyCode: Mock<SignInAuth["verifyCode"]>;
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
    sendCode: vi.fn<SignInAuth["sendCode"]>(async () => ok(undefined)),
    verifyCode: vi.fn<SignInAuth["verifyCode"]>(async () =>
      ok({ state: "signed-in", account: MARIA, returning: true, setupDone: true }),
    ),
    status: vi.fn<SignInAuth["status"]>(async () => ok({ state: "signed-out" })),
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

function renderScreen(auth: FakeAuth = fakeAuth(), signedOut?: SignedOutAccount) {
  render(
    <NowProvider frozenAt={NOW}>
      <DefaultSettingsProvider>
        <SeasonProvider>
          <SignInAuthProvider auth={auth}>
            <SignedOutAccountProvider account={signedOut}>
              <SignInScreen />
            </SignedOutAccountProvider>
          </SignInAuthProvider>
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

async function sendCode(email: string) {
  const person = user();

  await person.type(screen.getByLabelText("Email"), email);
  await person.click(screen.getByRole("button", { name: "Send code" }));
}

const codeField = () => screen.getByRole("textbox", { name: "Code" });

async function renderAtCode(auth: FakeAuth = fakeAuth()) {
  renderScreen(auth);

  await sendCode(MARIA.email);

  await screen.findByRole("heading", { name: "Enter the code" });

  return auth;
}

async function renderAtName(auth: FakeAuth = fakeAuth()) {
  const ana = { ...MARIA, email: "ana@example.com", name: null };

  auth.verifyCode.mockResolvedValue(
    ok({ state: "signed-in", account: ana, returning: false, setupDone: false }),
  );

  await renderAtCode(auth);

  await user().type(codeField(), "482913");

  await screen.findByLabelText("Your name");

  return auth;
}

async function renderAtLocation(auth: FakeAuth = fakeAuth()) {
  auth.verifyCode.mockResolvedValue(
    ok({ state: "signed-in", account: MARIA, returning: false, setupDone: false }),
  );

  await renderAtCode(auth);

  await user().type(codeField(), "482913");

  await screen.findByRole("heading", { name: "Where is this screen?" });

  return auth;
}

test("SIGNIN-01 opens on the empty email form", () => {
  renderScreen();

  expect(screen.getByRole("heading", { name: "Sign in or get started" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("");
});

test("SIGNIN-13 a screen signed out by the server opens the form with its email and waiting count", () => {
  renderScreen(fakeAuth(), { email: MARIA.email, pending: 2 });

  expect(screen.getByRole("heading", { name: "Sign in again" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue(MARIA.email);
  expect(screen.getByText(/Changes waiting on this screen: 2\./)).toBeInTheDocument();
});

test("SIGNIN-13 Use a different email from Enter the code keeps the signed-out notice", async () => {
  renderScreen(fakeAuth(), { email: MARIA.email, pending: 0 });

  await user().click(screen.getByRole("button", { name: "Send code" }));
  await advance(10_000);

  await user().click(await screen.findByRole("button", { name: "Use a different email" }));

  expect(screen.getByText("This screen was signed out")).toBeInTheDocument();
});

test("SIGNIN-02 an invalid email shows the error until the next keystroke", async () => {
  renderScreen();

  await sendCode("maria@example");

  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");

  await user().type(screen.getByLabelText("Email"), ".");

  expect(screen.getByLabelText("Email")).not.toHaveAccessibleDescription();
});

test("SIGNIN-03 a valid email moves to Sending", async () => {
  const auth = fakeAuth();

  auth.sendCode.mockReturnValue(new Promise(() => {}));

  renderScreen(auth);

  await sendCode("maria@example.com");

  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
});

test("SIGNIN-03 Send asks for a code to the trimmed email with this screen's time zone", async () => {
  const auth = renderScreen();

  await sendCode(" maria@example.com ");

  expect(auth.sendCode).toHaveBeenCalledExactlyOnceWith({
    email: "maria@example.com",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});

test("SIGNIN-04 the server accepting the send opens Enter the code with focus in the field", async () => {
  renderScreen();

  await sendCode("maria@example.com");

  expect(await screen.findByRole("heading", { name: "Enter the code" })).toBeInTheDocument();
  expect(codeField()).toHaveFocus();
});

test("SIGNIN-04 the 6th digit checks the code for the email and signs in", async () => {
  const auth = await renderAtCode();

  await user().type(codeField(), "482913");

  expect(auth.verifyCode).toHaveBeenCalledExactlyOnceWith({
    email: "maria@example.com",
    code: "482913",
  });
  expect(await screen.findByRole("heading", { name: "Welcome back, Maria" })).toBeInTheDocument();
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);
});

test('SIGNIN-04 pasting "482 913" checks 482913', async () => {
  const auth = await renderAtCode();

  await user().click(codeField());
  await user().paste("482 913");

  expect(auth.verifyCode).toHaveBeenCalledExactlyOnceWith({
    email: "maria@example.com",
    code: "482913",
  });
});

test("SIGNIN-04 Checking… holds the field while the code is checked", async () => {
  const auth = fakeAuth();

  auth.verifyCode.mockReturnValue(new Promise(() => {}));

  await renderAtCode(auth);

  await user().type(codeField(), "482913");

  expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
  expect(codeField()).toHaveAttribute("readonly");
});

test("SIGNIN-17 a wrong code clears the field until the next digit", async () => {
  const auth = fakeAuth();

  auth.verifyCode.mockResolvedValueOnce(err("wrong-code"));

  await renderAtCode(auth);

  await user().type(codeField(), "000000");

  expect(await screen.findByRole("alert")).toHaveTextContent("That code isn’t right. Try again.");
  expect(codeField()).toHaveValue("");
  expect(codeField()).toBeInvalid();

  await user().type(codeField(), "4");

  expect(codeField()).toHaveValue("4");
  expect(codeField()).toBeValid();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("SIGNIN-17 the 5th wrong try locks the field", async () => {
  const auth = fakeAuth();

  auth.verifyCode.mockResolvedValueOnce(err("code-locked"));

  await renderAtCode(auth);

  await user().type(codeField(), "000000");

  expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Send a new code.");
  expect(codeField()).toBeDisabled();
  expect(screen.getByRole("button", { name: "Send a new code" })).toBeEnabled();
});

test("SIGNIN-08 a code the server finds expired opens This code has expired", async () => {
  const auth = fakeAuth();

  auth.verifyCode.mockResolvedValueOnce(err("code-expired"));

  await renderAtCode(auth);

  await user().type(codeField(), "482913");

  expect(await screen.findByRole("heading", { name: "This code has expired" })).toBeInTheDocument();
});

test("SIGNIN-08 Enter the code expires after 10 minutes", async () => {
  await renderAtCode();

  await user().click(codeField());
  await advance(10 * 60_000);

  expect(screen.getByRole("heading", { name: "This code has expired" })).toBeInTheDocument();
});

test("SIGNIN-10 offline the 6th digit never submits, and Sign in works after reconnecting", async () => {
  const auth = await renderAtCode();

  const offline = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  await act(() => window.dispatchEvent(new Event("offline")));

  await user().type(codeField(), "482913");

  expect(auth.verifyCode).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();

  offline.mockReturnValue(true);
  await act(() => window.dispatchEvent(new Event("online")));
  await user().click(screen.getByRole("button", { name: "Sign in" }));

  expect(auth.verifyCode).toHaveBeenCalledOnce();

  vi.restoreAllMocks();
});

test("SIGNIN-03 a failed send returns to the form with the email kept", async () => {
  const auth = fakeAuth();

  auth.sendCode.mockResolvedValue(err("server"));

  renderScreen(auth);

  await sendCode("maria@example.com");

  expect(await screen.findByText("Couldn’t send. Try again.")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("maria@example.com");
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Couldn’t send. Try again.");
});

test("SIGNIN-08 Send a new code sends again from the expired screen", async () => {
  const auth = await renderAtCode();

  await advance(10 * 60_000);
  await user().click(screen.getByRole("button", { name: "Send a new code" }));

  expect(auth.sendCode).toHaveBeenCalledTimes(2);
  expect(auth.sendCode).toHaveBeenLastCalledWith(
    expect.objectContaining({ email: "maria@example.com" }),
  );
  expect(await screen.findByRole("heading", { name: "Enter the code" })).toBeInTheDocument();
});

test("SIGNIN-09 signing in saves the account to glance-meta and opens Today after 2.2 s", async () => {
  const auth = await renderAtCode();

  await user().type(codeField(), "482913");

  expect(await screen.findByRole("heading", { name: "Welcome back, Maria" })).toBeInTheDocument();
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);

  await advance(2_100);

  expect(navigation.replace).not.toHaveBeenCalled();

  await advance(100);

  expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/today");
});

test("SIGNIN-11 after signing out every device the form shows the toast for 4 s", async () => {
  window.history.replaceState(null, "", "/signin?toast=signed-out-all");

  renderScreen();

  expect(await screen.findByText("Signed out of all devices.")).toHaveAttribute("role", "status");

  await advance(3900);

  expect(screen.getByText("Signed out of all devices.")).toBeInTheDocument();

  await advance(200);

  expect(screen.queryByText("Signed out of all devices.")).not.toBeInTheDocument();
});

test("SIGNIN-11 the plain form shows no toast", async () => {
  renderScreen();

  await advance(100);

  expect(screen.queryByText("Signed out of all devices.")).not.toBeInTheDocument();
});

function openLink(link: "opened" | "stale") {
  window.history.replaceState(null, "", `/signin?link=${link}`);
}

test("SIGNIN-15 the device that opened a returning account's QR link signs in and opens Today", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(
    answer({ state: "signed-in", account: MARIA, returning: true, setupDone: true }),
  );

  openLink("opened");

  renderScreen(auth);

  expect(await screen.findByRole("heading", { name: "Welcome back, Maria" })).toBeInTheDocument();
  expect(auth.status).toHaveBeenCalledOnce();
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);

  await advance(2_200);

  expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/today");
});

test("SIGNIN-06 a new account's right code asks for the name first", async () => {
  const auth = fakeAuth();

  const ana = { ...MARIA, email: "ana@example.com", name: null };

  auth.verifyCode.mockResolvedValue(
    ok({ state: "signed-in", account: ana, returning: false, setupDone: false }),
  );

  await renderAtCode(auth);

  await user().type(codeField(), "482913");
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

  renderScreen(auth);

  expect(await screen.findByRole("heading", { name: "Where is this screen?" })).toBeInTheDocument();
  expect(auth.remember).not.toHaveBeenCalled();
});

test("SIGNIN-15 the device that opened a stale QR link gets the email form with no email", async () => {
  openLink("stale");

  renderScreen();

  expect(
    await screen.findByRole("heading", { name: "Sign in or get started" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("");
});

test("SIGNIN-10 a link check that can't reach the server opens the email form", async () => {
  const auth = fakeAuth();

  auth.status.mockResolvedValue(err("network"));

  openLink("opened");

  renderScreen(auth);

  expect(
    await screen.findByRole("heading", { name: "Sign in or get started" }),
  ).toBeInTheDocument();
});

test("SIGNIN-06 Continue saves the trimmed name and asks where the screen is", async () => {
  const auth = await renderAtName();

  const person = user();

  await person.type(screen.getByLabelText("Your name"), "  Ana Lee ");
  await person.click(screen.getByRole("button", { name: "Continue" }));

  expect(auth.name).toHaveBeenCalledExactlyOnceWith("Ana Lee");
  expect(await screen.findByRole("heading", { name: "Where is this screen?" })).toBeInTheDocument();
  expect(auth.remember).not.toHaveBeenCalled();
});

test("SIGNIN-14 a set-up step opens Where is this screen? with Skip for now", async () => {
  await renderAtLocation();

  expect(screen.getByRole("heading", { name: "Where is this screen?" })).toBeInTheDocument();
  expect(screen.getByLabelText("City or ZIP code")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument();
});

test("SIGNIN-14 a found place is saved to the account, then Welcome opens Today", async () => {
  const auth = await renderAtLocation();

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
  const auth = await renderAtLocation();

  await user().click(screen.getByRole("button", { name: "Skip for now" }));

  expect(await screen.findByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(auth.location).toHaveBeenCalledExactlyOnceWith({ skip: true });
  expect(auth.remember).toHaveBeenCalledExactlyOnceWith(MARIA);
});

test("SIGNIN-14 a failed save keeps the place and Continue saves it again", async () => {
  const auth = fakeAuth();

  auth.location.mockResolvedValueOnce(err("network"));

  await renderAtLocation(auth);

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

  await renderAtLocation(auth);

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

  await renderAtName(auth);

  const person = user();

  await person.type(screen.getByLabelText("Your name"), "Ana");
  await person.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByText("Couldn’t save. Try again.")).toBeInTheDocument();
  expect(screen.getByLabelText("Your name")).toHaveValue("Ana");
});

test("SIGNIN-04 Send a new code and Use a different email appear 10 s after the send", async () => {
  renderScreen();

  await sendCode("maria@example.com");

  expect(await screen.findByRole("timer")).toHaveTextContent("New code or different email in 0:10");

  await advance(3_000);

  expect(screen.getByRole("timer")).toHaveTextContent("New code or different email in 0:07");

  await advance(7_000);

  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Use a different email" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send a new code" })).toBeInTheDocument();
});

test("SIGNIN-04 Send a new code sends again and restarts the countdown", async () => {
  const auth = await renderAtCode();

  await advance(10_000);
  await user().click(await screen.findByRole("button", { name: "Send a new code" }));

  expect(auth.sendCode).toHaveBeenCalledTimes(2);
  expect(await screen.findByRole("timer")).toHaveTextContent("New code or different email in 0:10");
});

test("SIGNIN-10 the browser going offline disables sending", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

  renderScreen();

  expect(screen.getByRole("button", { name: "Send code" })).toBeDisabled();

  vi.restoreAllMocks();
});

test("SIGNIN-03 Couldn’t send clears on the next keystroke and Send retries", async () => {
  const auth = fakeAuth();

  auth.sendCode.mockResolvedValueOnce(err("server"));

  renderScreen(auth);

  await sendCode("maria@example.com");

  expect(await screen.findByLabelText("Email")).toHaveAccessibleDescription(
    "Couldn’t send. Try again.",
  );

  await user().type(screen.getByLabelText("Email"), "{Backspace}m");

  expect(screen.getByLabelText("Email")).not.toHaveAccessibleDescription();

  await user().click(screen.getByRole("button", { name: "Send code" }));

  expect(auth.sendCode).toHaveBeenCalledTimes(2);
  expect(auth.sendCode).toHaveBeenLastCalledWith(
    expect.objectContaining({ email: "maria@example.com" }),
  );
  expect(await screen.findByRole("heading", { name: "Enter the code" })).toBeInTheDocument();
});
