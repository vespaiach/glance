import { parseFixtureParams } from "./params";

describe("parseFixtureParams", () => {
  it("§6 an empty query has no fixture params", () => {
    expect(parseFixtureParams("")).toEqual({});
  });

  it("§6 reads every fixture param", () => {
    const query =
      "?bg=photo&sheet=newevent&time=noend&clock=24&season=winter&empty=1&net=wxerror&kb=1" +
      "&signin=expired&on=link&acct=returning&upload=progress&wx=choose&now=2026-10-09T19:12";

    expect(parseFixtureParams(query)).toEqual({
      bg: "photo",
      sheet: "newevent",
      time: "noend",
      clock: "24h",
      season: "winter",
      empty: true,
      net: "wxerror",
      kb: true,
      signin: "expired",
      on: "link",
      acct: "returning",
      upload: "progress",
      wx: "choose",
      now: new Date(2026, 9, 9, 19, 12),
    });
  });

  it.each([
    ["sheet", ["event", "newevent", "note", "newnote"]],
    ["time", ["start", "end", "error", "noend"]],
    ["season", ["spring", "summer", "fall", "winter"]],
    ["net", ["loading", "offline", "wxerror"]],
    ["signin", ["form", "sending", "sent", "name", "phone", "expired", "offline", "done"]],
    ["upload", ["one", "progress", "error", "offline"]],
    ["wx", ["searching", "unknown", "choose"]],
  ] as const)("§6 accepts each %s value", (name, values) => {
    for (const value of values) {
      expect(parseFixtureParams(`${name}=${value}`)).toEqual({ [name]: value });
    }
  });

  it.each([
    "bg=season",
    "sheet=photo",
    "time=later",
    "clock=12",
    "season=autumn",
    "empty=0",
    "net=online",
    "kb=yes",
    "signin=welcome",
    "on=device",
    "acct=new",
    "upload=done",
    "wx=found",
    "now=yesterday",
    "now=2026-10-09",
    "now=2026-13-40T10:41",
  ])("§6 ignores the unknown value %s", (query) => {
    expect(parseFixtureParams(query)).toEqual({});
  });

  it("§6 ignores params that are not fixture params", () => {
    expect(parseFixtureParams("date=2026-10-14&view=weather")).toEqual({});
  });

  it("TIME-03 now= without an offset is local time", () => {
    expect(parseFixtureParams("now=2026-10-09T10:41:30").now).toEqual(
      new Date(2026, 9, 9, 10, 41, 30),
    );
  });

  it("TIME-03 now= with an offset keeps that instant", () => {
    expect(parseFixtureParams("now=2026-10-09T17:41:00Z").now).toEqual(
      new Date(Date.UTC(2026, 9, 9, 17, 41)),
    );
  });

  it("§6 takes URLSearchParams too", () => {
    expect(parseFixtureParams(new URLSearchParams({ season: "spring" }))).toEqual({
      season: "spring",
    });
  });
});
