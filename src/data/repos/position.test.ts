import { err, ok } from "@/domain/result";
import { canLocate, currentPosition } from "./position";

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;

type Failure = (error: { code: number }) => void;

function stubGeolocation(answer: (success: Success, failure: Failure) => void) {
  const getCurrentPosition = vi.fn(
    (success: Success, failure: Failure, _options: PositionOptions) => answer(success, failure),
  );

  vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });

  return getCurrentPosition;
}

function stubPermission(state: PermissionState | undefined) {
  const permissions = state === undefined ? undefined : { query: async () => ({ state }) };

  vi.stubGlobal("navigator", { ...navigator, geolocation: {}, permissions });
}

beforeEach(() => {
  vi.stubGlobal("isSecureContext", true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("D20 the position is asked with low accuracy, a 10 s timeout and a reading up to 10 minutes old", async () => {
  const ask = stubGeolocation((success) =>
    success({ coords: { latitude: 45.5152, longitude: -122.6784 } }),
  );

  expect(await currentPosition()).toEqual(ok({ lat: 45.5152, lon: -122.6784 }));
  expect(ask.mock.calls[0]?.[2]).toEqual({
    enableHighAccuracy: false,
    timeout: 10_000,
    maximumAge: 600_000,
  });
});

test("D20 a refused permission is denied", async () => {
  stubGeolocation((_, failure) => failure({ code: 1 }));

  expect(await currentPosition()).toEqual(err("denied"));
});

test.each([2, 3])("D20 error code %i is no position", async (code) => {
  stubGeolocation((_, failure) => failure({ code }));

  expect(await currentPosition()).toEqual(err("no-position"));
});

test.each(["prompt", "granted"] as const)(
  "LOC-01 the device can locate itself when the permission is %s",
  async (state) => {
    stubPermission(state);

    expect(await canLocate()).toBe(true);
  },
);

test("LOC-01 the device can locate itself when the browser has no permissions API", async () => {
  stubPermission(undefined);

  expect(await canLocate()).toBe(true);
});

test("LOC-01 an already blocked permission hides Use my location", async () => {
  stubPermission("denied");

  expect(await canLocate()).toBe(false);
});

test("LOC-01 a page that isn't secure can't locate itself", async () => {
  stubPermission("granted");
  vi.stubGlobal("isSecureContext", false);

  expect(await canLocate()).toBe(false);
});

test("LOC-01 a browser without geolocation can't locate itself", async () => {
  const { geolocation: _, ...rest } = navigator;

  vi.stubGlobal("navigator", rest);

  expect(await canLocate()).toBe(false);
});
