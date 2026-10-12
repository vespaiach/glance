import { render, screen } from "@testing-library/react";
import { deviceTimeZone } from "@/domain/zone";
import { useTimeZone } from "./providers/timeZone";
import { SignedOutProviders } from "./SignedOutProviders";

function ZoneProbe() {
  return <p>zone {useTimeZone()}</p>;
}

test("LOC-06 the demo Sign in screen follows the fixture place's zone", async () => {
  render(
    <SignedOutProviders demo>
      <ZoneProbe />
    </SignedOutProviders>,
  );

  expect(await screen.findByText("zone America/Los_Angeles")).toBeInTheDocument();
});

test("LOC-06 a real Sign in screen with no place follows the device's zone", async () => {
  render(
    <SignedOutProviders demo={false}>
      <ZoneProbe />
    </SignedOutProviders>,
  );

  expect(await screen.findByText(`zone ${deviceTimeZone()}`)).toBeInTheDocument();
});
