import { render, screen } from "@testing-library/react";
import { type SignedOutAccount, useSignedOutAccount } from "@/data/repos";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { deviceTimeZone } from "@/domain/zone";
import { useTimeZone } from "./providers/timeZone";
import { SignedOutProviders } from "./SignedOutProviders";

const kept = vi.hoisted(() => ({ account: undefined as SignedOutAccount | undefined }));

vi.mock("@/data/repos", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/data/repos")>();

  return {
    ...original,
    signedOutAccount: async () => kept.account,
  };
});

afterEach(() => {
  kept.account = undefined;
});

function ZoneProbe() {
  return <p>zone {useTimeZone()}</p>;
}

test("LOC-06 a real Sign in screen with no place follows the device's zone", async () => {
  render(
    <SignedOutProviders>
      <ZoneProbe />
    </SignedOutProviders>,
  );

  expect(await screen.findByText(`zone ${deviceTimeZone()}`)).toBeInTheDocument();
});

function SignedOutProbe() {
  const account = useSignedOutAccount();

  return <p>{account ? `signed out ${account.email} ${account.pending}` : "signed in"}</p>;
}

describe("signed out by the server", () => {
  it("SIGNIN-13 the form follows the kept account's zone and knows its waiting changes", async () => {
    kept.account = {
      email: "maria@example.com",
      pending: 1,
      settings: {
        ...DEFAULT_SETTINGS,
        weatherLocation: {
          name: "Tokyo",
          region: "Japan",
          lat: 35.68,
          lon: 139.69,
          timeZone: "Asia/Tokyo",
        },
      },
    };

    render(
      <SignedOutProviders>
        <ZoneProbe />
        <SignedOutProbe />
      </SignedOutProviders>,
    );

    expect(await screen.findByText("zone Asia/Tokyo")).toBeInTheDocument();
    expect(screen.getByText("signed out maria@example.com 1")).toBeInTheDocument();
  });

  it("SIGNIN-13 a screen that was never signed in has no signed-out account", async () => {
    render(
      <SignedOutProviders>
        <SignedOutProbe />
      </SignedOutProviders>,
    );

    expect(await screen.findByText("signed in")).toBeInTheDocument();
  });
});
