import { FIXTURE_FAMILY, FIXTURE_PHOTOS } from "./data";
import { parseFixtureParams } from "./params";

describe("parseFixtureParams", () => {
  it("§6 an empty query has no fixture params", () => {
    expect(parseFixtureParams("")).toEqual({});
  });

  it("§6 reads every fixture param", () => {
    const query =
      "?bg=photo&sheet=newevent&time=noend&clock=24&season=winter&empty=1&net=wxerror&kb=1" +
      "&signin=expired&acct=returning&upload=progress&wx=choose&now=2026-10-09T19:12";

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
    [
      "signin",
      [
        "form",
        "sending",
        "sent",
        "checking",
        "wrong",
        "locked",
        "name",
        "expired",
        "offline",
        "done",
      ],
    ],
    ["upload", ["one", "progress", "error", "offline", "done"]],
    ["wx", ["searching", "unknown", "choose"]],
    ["events", ["many", "none"]],
    ["bright", ["full", "low"]],
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
    "signin=phone",
    "on=link",
    "code=abc",
    "acct=new",
    "upload=finished",
    "wx=found",
    "bright=medium",
    "now=yesterday",
    "now=2026-10-09",
    "now=2026-13-40T10:41",
    "pending=-1",
    "pending=many",
    "switch=yes",
    "discard=yes",
    "allday=yes",
    "day=32",
    "day=0",
    "day=ten",
    "who=bao",
    "whosheet=yes",
    "span=12",
  ])("§6 ignores the unknown value %s", (query) => {
    expect(parseFixtureParams(query)).toEqual({});
  });

  it("SIGNIN-03 reads signin=sendfail", () => {
    expect(parseFixtureParams("signin=sendfail")).toEqual({ signin: "sendfail" });
  });

  it("SIGNIN-13 reads signin=ended with the waiting count and another email entered", () => {
    expect(parseFixtureParams("signin=ended&pending=3&switch=1")).toEqual({
      signin: "ended",
      pending: 3,
      switch: true,
    });
  });

  it("CAL-05 reads whosheet=1", () => {
    expect(parseFixtureParams("whosheet=1")).toEqual({ whosheet: true });
  });

  it("SIGNIN-16 reads demo=1", () => {
    expect(parseFixtureParams("signin=form&demo=1")).toEqual({ signin: "form", demo: true });
    expect(parseFixtureParams("demo=yes")).toEqual({});
  });

  it("SIGNIN-04 reads backin= and hold=1", () => {
    expect(parseFixtureParams("signin=sent&backin=8&hold=1")).toEqual({
      signin: "sent",
      backin: 8,
      hold: true,
    });
    expect(parseFixtureParams("backin=0")).toEqual({ backin: 0 });
  });

  it("SIGNIN-04 reads code= as up to 6 digits", () => {
    expect(parseFixtureParams("signin=sent&code=482")).toEqual({ signin: "sent", code: "482" });
    expect(parseFixtureParams("code=48 2913 7")).toEqual({ code: "482913" });
  });

  it.each(["backin=11", "backin=-1", "backin=soon", "hold=yes"])(
    "SIGNIN-04 ignores %s",
    (query) => {
      expect(parseFixtureParams(query)).toEqual({});
    },
  );

  it("TODAY-12 reads allday=1", () => {
    expect(parseFixtureParams("allday=1")).toEqual({ allday: true });
  });

  it("CAL-04 reads day= as that day of October 2026", () => {
    expect(parseFixtureParams("day=10")).toEqual({ day: "2026-10-10" });
    expect(parseFixtureParams("day=1")).toEqual({ day: "2026-10-01" });
  });

  it("CAL-05 reads who= as the fixture tags' ids and who=none as nobody", () => {
    expect(parseFixtureParams("who=mom,an,bao")).toEqual({
      who: [FIXTURE_FAMILY[2]?.id, FIXTURE_FAMILY[0]?.id],
    });
    expect(parseFixtureParams("who=none")).toEqual({ who: [] });
  });

  it("CAL-03 reads dp=open", () => {
    expect(parseFixtureParams("dp=open")).toEqual({ dp: "open" });
  });

  it("CAL-06 reads span=24", () => {
    expect(parseFixtureParams("span=24")).toEqual({ span24: true });
  });

  it("EVT-09 reads sheet=past and details=1", () => {
    expect(parseFixtureParams("sheet=past&details=1")).toEqual({ sheet: "past", details: true });
  });

  it("FAM-07 ignores the old Family sheet params", () => {
    expect(parseFixtureParams("sheet=family&rm=an&famname=Bao&famerr=1")).toEqual({});
  });

  it("PHOTO-13 reads phdel=1, PHOTO-03 phqr=1 and PHOTO-01 play=0", () => {
    expect(parseFixtureParams("phdel=1&phqr=1&play=0")).toEqual({
      phdel: true,
      phqr: true,
      play: "0",
    });
  });

  it.each(["phdel=yes", "phqr=0", "play=1"])("PHOTO-01 ignores %s", (query) => {
    expect(parseFixtureParams(query)).toEqual({});
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

  it("SHELL-08 ignores the removed bar= and barauto=", () => {
    expect(parseFixtureParams("barauto=off")).toEqual({});
    expect(parseFixtureParams("bar=hidden")).toEqual({});
    expect(parseFixtureParams("bar=auto&barauto=on")).toEqual({});
  });

  it("SHELL-08 reads rail=1 and rail=open", () => {
    expect(parseFixtureParams("rail=1")).toEqual({ rail: "1" });
    expect(parseFixtureParams("rail=open")).toEqual({ rail: "open" });
    expect(parseFixtureParams("rail=0")).toEqual({});
  });

  it("PHOTO-14 reads full=1 and chrome=0", () => {
    expect(parseFixtureParams("full=1&chrome=0")).toEqual({ full: true, chrome: "0" });
    expect(parseFixtureParams("full=0&chrome=1")).toEqual({});
  });

  it("SIGNIN-15 reads qr=open and qr=failed", () => {
    expect(parseFixtureParams("qr=open")).toEqual({ qr: "open" });
    expect(parseFixtureParams("qr=failed")).toEqual({ qr: "failed" });
    expect(parseFixtureParams("qr=done")).toEqual({});
  });

  it("TODAY-07 reads potd=qr, potd=error and potdlong=1", () => {
    expect(parseFixtureParams("?potd=qr&potdlong=1")).toEqual({ potd: "qr", potdlong: true });
    expect(parseFixtureParams("?potd=error")).toEqual({ potd: "error" });
  });

  it("TODAY-07 reads potd= a fixture photo's slug as that photo's id", () => {
    const coast = FIXTURE_PHOTOS.find((photo) => photo.title === "Cannon Beach");

    expect(parseFixtureParams("?potd=coast")).toEqual({ potdPhoto: coast?.id });
    expect(parseFixtureParams("?potd=nowhere")).toEqual({});
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
