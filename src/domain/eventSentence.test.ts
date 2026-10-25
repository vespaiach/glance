import { isPlaceholder, nextWord, sentenceTokens, whoText } from "./eventSentence";
import type { Tag } from "./schemas";

const tag = (id: string, name: string): Tag => ({
  id,
  name,
  color: "lilac",
  createdAt: `2026-01-0${id}T00:00:00Z`,
});

const TAGS = [tag("1", "Mom"), tag("2", "Dad"), tag("3", "Linh"), tag("4", "Bao"), tag("5", "An")];

const BLANK = { title: "", location: "" };

const FILLED = { title: "Swim", location: "Pool" };

describe("sentence tokens", () => {
  it("EVT-02 a timed event reads title on day from start to end for who at place", () => {
    expect(sentenceTokens({ hasEnd: true, hasPlace: true, view: false })).toEqual([
      { word: "title", join: null },
      { word: "day", join: "on" },
      { word: "start", join: "from" },
      { word: "end", join: "to" },
      { word: "who", join: "for" },
      { word: "where", join: "at" },
    ]);
  });

  it("EVT-02 an event with no end reads at start and has no end word", () => {
    expect(sentenceTokens({ hasEnd: false, hasPlace: true, view: false })).toEqual([
      { word: "title", join: null },
      { word: "day", join: "on" },
      { word: "start", join: "at" },
      { word: "who", join: "for" },
      { word: "where", join: "at" },
    ]);
  });

  it("EVT-02 EVT-08 an all-day event reads on day, all day, for who", () => {
    expect(sentenceTokens({ allDay: true, hasEnd: true, hasPlace: true, view: false })).toEqual([
      { word: "title", join: null },
      { word: "day", join: "on" },
      { word: "start", join: "comma" },
      { word: "who", join: "commaFor" },
      { word: "where", join: "at" },
    ]);
  });

  it("EVT-02 editing keeps the place word as a placeholder when there is no place", () => {
    const words = sentenceTokens({ hasEnd: true, hasPlace: false, view: false }).map((t) => t.word);

    expect(words).toContain("where");
  });

  it("EVT-09 view mode leaves out the at-place part when there is no place", () => {
    const words = sentenceTokens({ hasEnd: true, hasPlace: false, view: true }).map((t) => t.word);

    expect(words).toEqual(["title", "day", "start", "end", "who"]);
  });
});

describe("next word", () => {
  it.each([
    ["title", "day"],
    ["day", "start"],
    ["start", "end"],
    ["end", "who"],
    ["who", "where"],
    ["where", "notes"],
    ["notes", undefined],
  ] as const)("EVT-12 Next from %s goes to %s", (word, expected) => {
    expect(nextWord(word, { hasEnd: true })).toBe(expected);
  });

  it("EVT-12 Next skips Ends on an all-day event", () => {
    expect(nextWord("start", { allDay: true, hasEnd: true })).toBe("who");
  });

  it("EVT-12 Next skips Ends with no end time", () => {
    expect(nextWord("start", { hasEnd: false })).toBe("who");
  });
});

describe("placeholders", () => {
  it("EVT-02 a blank title and place are placeholders", () => {
    expect(isPlaceholder("title", BLANK, [])).toBe(true);
    expect(isPlaceholder("where", BLANK, [])).toBe(true);
  });

  it("EVT-02 a title of spaces is still a placeholder", () => {
    expect(isPlaceholder("title", { ...BLANK, title: "  " }, [])).toBe(true);
  });

  it("EVT-02 a typed title and place are set", () => {
    expect(isPlaceholder("title", FILLED, [])).toBe(false);
    expect(isPlaceholder("where", FILLED, [])).toBe(false);
  });

  it.each(["day", "start", "end", "who"] as const)(
    "EVT-03 the default %s is a placeholder until touched",
    (word) => {
      expect(isPlaceholder(word, FILLED, [])).toBe(true);
      expect(isPlaceholder(word, FILLED, [word])).toBe(false);
    },
  );
});

describe("who text", () => {
  const ids = (...names: string[]) =>
    names.map((name) => TAGS.find((one) => one.name === name)?.id ?? "");

  it("EVT-02 every tag reads everyone", () => {
    expect(whoText(ids("Mom", "Dad", "Linh", "Bao", "An"), TAGS)).toEqual({ kind: "everyone" });
  });

  it("EVT-02 no tag reads nobody", () => {
    expect(whoText([], TAGS)).toEqual({ kind: "nobody" });
  });

  it("EVT-02 one, two and three people are all named, in tag order", () => {
    expect(whoText(ids("Dad"), TAGS)).toEqual({ kind: "people", names: ["Dad"], others: 0 });
    expect(whoText(ids("Dad", "Mom"), TAGS)).toEqual({
      kind: "people",
      names: ["Mom", "Dad"],
      others: 0,
    });
    expect(whoText(ids("Linh", "Mom", "Dad"), TAGS)).toEqual({
      kind: "people",
      names: ["Mom", "Dad", "Linh"],
      others: 0,
    });
  });

  it("EVT-02 four of five people read a, b and 2 others", () => {
    expect(whoText(ids("Mom", "Dad", "Linh", "Bao"), TAGS)).toEqual({
      kind: "people",
      names: ["Mom", "Dad"],
      others: 2,
    });
  });

  it("EVT-13 the Same time names name at most two", () => {
    expect(whoText(ids("Mom", "Dad", "Linh"), TAGS, 2)).toEqual({
      kind: "people",
      names: ["Mom", "Dad"],
      others: 1,
    });
  });
});
