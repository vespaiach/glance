import type { Tag } from "./schemas";
import { suggestTags } from "./tagMatch";

const tag = (n: number, name: string): Tag => ({
  id: `0192f1a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  name,
  color: "lilac",
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = tag(1, "Minh-An");

const HY = tag(2, "Minh-Hy");

const MOM = tag(3, "Mom");

const DAD = tag(4, "Dad");

const THANG = tag(5, "Thắng");

const ANNA = tag(6, "Anna Lee");

const names = (tags: readonly Tag[]) => tags.map((one) => one.name);

describe("suggestTags", () => {
  it("EVT-11 suggests nothing for an empty or blank input", () => {
    expect(suggestTags([AN, MOM], "", [])).toEqual([]);
    expect(suggestTags([AN, MOM], "  ", [])).toEqual([]);
  });

  it("EVT-11 a name that starts with the input comes first", () => {
    expect(names(suggestTags([MOM, AN], "m", []))).toEqual(["Mom", "Minh-An"]);
  });

  it("EVT-11 a word that starts with the input comes after a name prefix", () => {
    expect(names(suggestTags([ANNA, AN], "an", []))).toEqual(["Anna Lee", "Minh-An"]);
    expect(names(suggestTags([ANNA, tag(7, "Bo Lee")], "le", []))).toEqual(["Anna Lee", "Bo Lee"]);
  });

  it("EVT-11 a name that contains the input comes after a word prefix", () => {
    expect(names(suggestTags([tag(7, "Xan"), AN], "an", []))).toEqual(["Minh-An", "Xan"]);
  });

  it("EVT-11 letters in order match after contains", () => {
    expect(names(suggestTags([AN, HY], "mnh", []))).toEqual(["Minh-An", "Minh-Hy"]);
    expect(names(suggestTags([tag(7, "Hymn"), AN], "mn", []))).toEqual(["Hymn", "Minh-An"]);
  });

  it("EVT-11 one typo away matches last, with 3 or more characters", () => {
    expect(names(suggestTags([DAD, MOM], "mpm", []))).toEqual(["Mom"]);
    expect(names(suggestTags([AN], "mixn", []))).toEqual([]);
    expect(names(suggestTags([AN], "mimh", []))).toEqual(["Minh-An"]);
    expect(names(suggestTags([DAD], "dd", []))).toEqual(["Dad"]);
    expect(names(suggestTags([MOM], "mp", []))).toEqual([]);
  });

  it("EVT-11 a typo of a missing or extra letter matches", () => {
    expect(names(suggestTags([DAD], "daad", []))).toEqual(["Dad"]);
    expect(names(suggestTags([AN], "minha-xxn", []))).toEqual([]);
    expect(names(suggestTags([AN], "mnih", []))).toEqual([]);
  });

  it("EVT-11 matching ignores case, accents, spaces and hyphens", () => {
    expect(names(suggestTags([THANG], "THANG", []))).toEqual(["Thắng"]);
    expect(names(suggestTags([AN], "minhan", []))).toEqual(["Minh-An"]);
    expect(names(suggestTags([AN], "minh an", []))).toEqual(["Minh-An"]);
    expect(names(suggestTags([ANNA], "annal", []))).toEqual(["Anna Lee"]);
    expect(names(suggestTags([tag(7, "Đức")], "duc", []))).toEqual(["Đức"]);
  });

  it("EVT-11 tags already on the event are not suggested", () => {
    expect(names(suggestTags([AN, HY], "minh", [AN.id]))).toEqual(["Minh-Hy"]);
  });

  it("EVT-11 matches of the same tier keep the tag order", () => {
    expect(names(suggestTags([HY, AN], "minh", []))).toEqual(["Minh-Hy", "Minh-An"]);
  });

  it("EVT-11 no match suggests nothing", () => {
    expect(suggestTags([AN, MOM, DAD], "zed", [])).toEqual([]);
  });
});
