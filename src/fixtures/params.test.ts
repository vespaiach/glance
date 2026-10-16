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
      now: new Date("2026-10-10T02:12:00Z"),
    });
  });

  it.each([
    ["sheet", ["event", "newevent", "note", "newnote", "allday", "photo", "photometa"]],
    ["time", ["start", "end", "error", "noend"]],
    ["season", ["spring", "summer", "fall", "winter"]],
    ["net", ["loading", "offline", "wxerror"]],
    ["signin", ["form", "sending", "sent", "name", "phone", "expired", "offline", "done"]],
    ["upload", ["one", "progress", "error", "offline", "done"]],
    ["wx", ["searching", "unknown", "choose"]],
    ["events", ["many"]],
  ] as const)("§6 accepts each %s value", (name, values) => {
    for (const value of values) {
      expect(parseFixtureParams(`${name}=${value}`)).toEqual({ [name]: value });
    }
  });

  it.each([
    "bg=season",
    "sheet=photos",
    "time=later",
    "clock=12",
    "season=autumn",
    "empty=0",
    "net=online",
    "kb=yes",
    "signin=welcome",
    "on=device",
    "acct=new",
    "upload=finished",
    "wx=found",
    "now=yesterday",
    "now=2026-10-09",
    "now=2026-13-40T10:41",
    "pending=-1",
    "pending=many",
    "switch=yes",
    "discard=yes",
    "allday=yes",
  ])("§6 ignores the unknown value %s", (query) => {
    expect(parseFixtureParams(query)).toEqual({});
  });

  it("SIGNIN-13 reads signin=ended with the waiting count and another email entered", () => {
    expect(parseFixtureParams("signin=ended&pending=3&switch=1")).toEqual({
      signin: "ended",
      pending: 3,
      switch: true,
    });
  });

  it("TODAY-12 reads allday=1", () => {
    expect(parseFixtureParams("allday=1")).toEqual({ allday: true });
  });

  it("§8.9 reads discard=1", () => {
    expect(parseFixtureParams("sheet=newnote&discard=1")).toEqual({
      sheet: "newnote",
      discard: true,
    });
  });

  it("SET-09 wx= on /settings/location keeps the saved place", () => {
    expect(parseFixtureParams("wx=tz", "/settings/location")).toEqual({
      wx: "tz",
      keepPlace: true,
    });
  });

  it("SET-09 other pages don't keep the place", () => {
    expect(parseFixtureParams("wx=tz", "/weather")).toEqual({ wx: "tz" });
  });

  it("SET-10 reads amb= and pick= for the Ambient screen page", () => {
    expect(parseFixtureParams("amb=split&pick=wknd.e")).toEqual({ amb: "split", pick: "wknd.e" });
  });

  it("SHELL-07 reads bar= and barauto=", () => {
    expect(parseFixtureParams("bar=hidden&barauto=off")).toEqual({ bar: "hidden", barauto: "off" });
    expect(parseFixtureParams("bar=float")).toEqual({ bar: "float" });
    expect(parseFixtureParams("bar=auto&barauto=on")).toEqual({});
  });

  it("§6 ignores params that are not fixture params", () => {
    expect(parseFixtureParams("date=2026-10-14&view=weather")).toEqual({});
  });

  it("LOC-06 now= without an offset is a Pacific wall time", () => {
    expect(parseFixtureParams("now=2026-10-09T10:41:30").now).toEqual(
      new Date("2026-10-09T17:41:30Z"),
    );
  });

  it("LOC-06 now= without an offset follows Pacific standard time in winter", () => {
    expect(parseFixtureParams("now=2026-12-24T10:41").now).toEqual(
      new Date("2026-12-24T18:41:00Z"),
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
