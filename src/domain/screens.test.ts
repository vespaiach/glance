import { activeStamp, deviceOf } from "./screens";

const UA = {
  iPhone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iPhoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  androidPhone:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  iPad: "Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  androidFirefox: "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
  unknown: "curl/8.7.1",
};

describe("deviceOf", () => {
  it.each([
    ["iPhone", UA.iPhone, { kind: "smartphone", browser: "Safari" }],
    ["iPhone Chrome", UA.iPhoneChrome, { kind: "smartphone", browser: "Chrome" }],
    ["Android phone", UA.androidPhone, { kind: "smartphone", browser: "Chrome" }],
    ["Android Firefox phone", UA.androidFirefox, { kind: "smartphone", browser: "Firefox" }],
    ["Android tablet", UA.androidTablet, { kind: "tablet", browser: "Chrome" }],
    ["iPad", UA.iPad, { kind: "tablet", browser: "Safari" }],
    ["Mac Chrome", UA.macChrome, { kind: "monitor", browser: "Chrome" }],
    ["Mac Safari", UA.macSafari, { kind: "monitor", browser: "Safari" }],
    ["Windows Edge", UA.windowsEdge, { kind: "monitor", browser: "Edge" }],
    ["Linux Firefox", UA.linuxFirefox, { kind: "monitor", browser: "Firefox" }],
    ["unknown client", UA.unknown, { kind: "monitor", browser: null }],
    ["missing header", undefined, { kind: "monitor", browser: null }],
  ] as const)("D23 reads a %s user agent as %o", (_, userAgent, expected) => {
    expect(deviceOf(userAgent)).toEqual(expected);
  });
});

describe("activeStamp", () => {
  const tz = "America/Los_Angeles";

  const now = new Date("2026-10-09T17:41:00.000Z");

  it.each([
    ["just now", "2026-10-09T17:40:40.000Z", { kind: "minutes", count: 1 }],
    ["12 minutes ago", "2026-10-09T17:29:00.000Z", { kind: "minutes", count: 12 }],
    ["59 minutes ago", "2026-10-09T16:41:30.000Z", { kind: "minutes", count: 59 }],
    ["an hour ago", "2026-10-09T16:41:00.000Z", { kind: "hours", count: 1 }],
    ["early this morning", "2026-10-09T07:10:00.000Z", { kind: "hours", count: 10 }],
    ["late yesterday", "2026-10-09T06:59:00.000Z", { kind: "yesterday" }],
    ["yesterday morning", "2026-10-08T15:00:00.000Z", { kind: "yesterday" }],
    ["a week ago", "2026-10-03T01:30:00.000Z", { kind: "on", date: "Oct 2" }],
  ] as const)("SET-12 a screen last seen %s is stamped %o", (_, lastSeenAt, expected) => {
    expect(activeStamp(lastSeenAt, now, tz)).toEqual(expected);
  });

  it("SET-12 under an hour reads in minutes even across midnight", () => {
    const pastMidnight = new Date("2026-10-09T07:10:00.000Z");

    expect(activeStamp("2026-10-09T06:50:00.000Z", pastMidnight, tz)).toEqual({
      kind: "minutes",
      count: 20,
    });
  });
});
