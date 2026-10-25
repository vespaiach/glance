import { type Tag, TagColorSchema } from "./schemas";
import {
  eventColor,
  exactTag,
  filterLabel,
  filterScope,
  filterTagIds,
  initials,
  liveFilter,
  matchesFilter,
  memberRemoval,
  nextFreeColor,
  pickWho,
  removalLine,
  stackCircles,
  toggleEveryone,
  toggleFilter,
  whoIds,
  whoLabel,
  whoValue,
} from "./tags";

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `0192f1a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = tag(1, "Minh-An", "lilac");

const HY = tag(2, "Minh-Hy", "sky");

const MOM = tag(3, "Mom", "coral");

const FAMILY = [AN, HY, MOM];

const everyone = { everyone: true, tagIds: [] };

const forTags = (...tags: Tag[]) => ({
  everyone: false,
  tagIds: tags.map((one) => one.id),
});

const nobody = { everyone: false, tagIds: [] };

const ALL_IDS = FAMILY.map((one) => one.id);

const selected = (...tags: Tag[]) => new Set(tags.map((one) => one.id));

describe("whoLabel", () => {
  it("§7 reads Everyone for an everyone plan", () => {
    expect(whoLabel(everyone, FAMILY, "Everyone")).toBe("Everyone");
  });

  it("§7 joins the names in tag order, not the order they were picked", () => {
    expect(whoLabel(forTags(MOM, AN), FAMILY, "Everyone")).toBe("Minh-An, Mom");
  });

  it("D24 skips ids of tags that are gone", () => {
    expect(whoLabel(forTags(HY, tag(9, "Gone", "ice")), FAMILY, "Everyone")).toBe("Minh-Hy");
  });
});

describe("eventColor", () => {
  it("§7 a plan for one tag takes that tag's color", () => {
    expect(eventColor(forTags(HY), FAMILY)).toBe("sky");
  });

  it("§7 a plan for several tags or everyone takes the season soft color", () => {
    expect(eventColor(forTags(AN, HY), FAMILY)).toBe("soft");
    expect(eventColor(everyone, FAMILY)).toBe("soft");
  });

  it("D24 a plan whose one tag is gone takes the season soft color", () => {
    expect(eventColor(forTags(tag(9, "Gone", "ice")), FAMILY)).toBe("soft");
  });
});

describe("nextFreeColor", () => {
  it("FAM-04 offers the first color no tag uses", () => {
    expect(nextFreeColor([AN, MOM])).toBe("sky");
  });

  it("FAM-04 offers the first color again once all 12 are taken", () => {
    const full = TagColorSchema.options.map((color, index) => tag(index + 1, color, color));

    expect(nextFreeColor(full)).toBe("lilac");
  });
});

describe("matchesFilter", () => {
  it("CAL-05 with every tag selected every plan shows, nobody plans included", () => {
    const all = selected(...FAMILY);

    expect(matchesFilter(forTags(MOM), all, ALL_IDS)).toBe(true);
    expect(matchesFilter(everyone, all, ALL_IDS)).toBe(true);
    expect(matchesFilter(nobody, all, ALL_IDS)).toBe(true);
  });

  it("CAL-05 a plan shows when any selected tag is on it", () => {
    expect(matchesFilter(forTags(AN, MOM), selected(MOM), ALL_IDS)).toBe(true);
    expect(matchesFilter(forTags(AN), selected(MOM), ALL_IDS)).toBe(false);
  });

  it("CAL-05 everyone plans show while any tag is selected", () => {
    expect(matchesFilter(everyone, selected(MOM), ALL_IDS)).toBe(true);
  });

  it("CAL-05 nobody plans show only while every tag is selected", () => {
    expect(matchesFilter(nobody, selected(AN, HY), ALL_IDS)).toBe(false);
  });

  it("CAL-05 with every tag off no plan shows, everyone and nobody plans included", () => {
    expect(matchesFilter(everyone, new Set(), ALL_IDS)).toBe(false);
    expect(matchesFilter(nobody, new Set(), ALL_IDS)).toBe(false);
    expect(matchesFilter(forTags(AN), new Set(), ALL_IDS)).toBe(false);
  });

  it("CAL-05 a family with no tags yet shows every plan", () => {
    expect(matchesFilter(nobody, new Set(), [])).toBe(true);
  });
});

describe("toggleFilter", () => {
  it("CAL-05 tapping a selected tag turns only it off", () => {
    expect(toggleFilter(selected(...FAMILY), HY.id, ALL_IDS)).toEqual(selected(AN, MOM));
  });

  it("CAL-05 tapping a tag that is off turns it on", () => {
    expect(toggleFilter(selected(HY), MOM.id, ALL_IDS)).toEqual(selected(HY, MOM));
  });

  it("CAL-05 turning the last tag off leaves nobody", () => {
    expect(toggleFilter(selected(HY), HY.id, ALL_IDS)).toEqual(new Set());
  });

  it("FAM-05 turning every tag on selects every tag, also ones added later", () => {
    expect(toggleFilter(selected(AN, HY), MOM.id, ALL_IDS)).toBe("all");
  });
});

describe("liveFilter", () => {
  it("FAM-05 the every-tag filter selects every tag, new ones included", () => {
    expect(liveFilter("all", ALL_IDS)).toEqual(selected(...FAMILY));
  });

  it("FAM-05 a filter without every tag leaves a new tag off", () => {
    expect(liveFilter(selected(AN, HY), ALL_IDS)).toEqual(selected(AN, HY));
  });

  it("D24 ids of tags that are gone drop out", () => {
    expect(liveFilter(new Set([AN.id, "gone"]), ALL_IDS)).toEqual(selected(AN));
  });

  it("CAL-05 nobody stays nobody", () => {
    expect(liveFilter(new Set(), ALL_IDS)).toEqual(new Set());
  });

  it("CAL-05 removing the only selected member resets the filter to everyone", () => {
    expect(liveFilter(selected(MOM), [AN.id, HY.id])).toEqual(selected(AN, HY));
  });
});

describe("filterTagIds", () => {
  it("CAL-07 every tag selected gives a new event everyone", () => {
    expect(filterTagIds(selected(...FAMILY), ALL_IDS)).toEqual(everyone);
  });

  it("CAL-07 some tags give a new event those tags in tag order", () => {
    expect(filterTagIds(selected(MOM, AN), ALL_IDS)).toEqual(forTags(AN, MOM));
  });

  it("CAL-07 no tag selected gives a new event nobody", () => {
    expect(filterTagIds(new Set(), ALL_IDS)).toEqual(nobody);
  });
});

describe("whoValue", () => {
  it("EVT-11 every tag on the draft stores everyone", () => {
    expect(whoValue([MOM.id, AN.id, HY.id], ALL_IDS)).toEqual(everyone);
  });

  it("EVT-11 some tags store those tags", () => {
    expect(whoValue([MOM.id, AN.id], ALL_IDS)).toEqual(forTags(MOM, AN));
  });

  it("EVT-11 no tag stores nobody", () => {
    expect(whoValue([], ALL_IDS)).toEqual(nobody);
  });

  it("D24 with no tags yet a draft stores everyone, so the first tag joins it", () => {
    expect(whoValue([], [])).toEqual(everyone);
  });

  it("FAM-04 a tag just created and not yet listed stays on the draft", () => {
    expect(whoValue([AN.id, "new"], ALL_IDS)).toEqual({ everyone: false, tagIds: [AN.id, "new"] });
  });
});

describe("whoIds", () => {
  it("EVT-11 an everyone event shows every tag", () => {
    expect(whoIds(everyone, ALL_IDS)).toEqual(ALL_IDS);
  });

  it("EVT-11 an event for some tags shows them", () => {
    expect(whoIds(forTags(MOM, AN), ALL_IDS)).toEqual([MOM.id, AN.id]);
  });
});

describe("exactTag", () => {
  it("EVT-11 finds the tag with exactly that name in any case", () => {
    expect(exactTag(FAMILY, " mOM ")).toBe(MOM);
  });

  it("EVT-11 a partial name finds no tag", () => {
    expect(exactTag(FAMILY, "Minh")).toBeUndefined();
  });
});

const LABELS = {
  everyone: "Everyone",
  nobody: "No one",
  people: (count: number) => `${count} people`,
};

describe("filterLabel", () => {
  it("CAL-05 is Everyone when every tag is shown", () => {
    expect(filterLabel(new Set(ALL_IDS), FAMILY, LABELS)).toBe("Everyone");
  });

  it("CAL-05 names one or two shown tags in tag order", () => {
    expect(filterLabel(new Set([MOM.id]), FAMILY, LABELS)).toBe("Mom");
    expect(filterLabel(new Set([MOM.id, AN.id]), FAMILY, LABELS)).toBe("Minh-An, Mom");
  });

  it("CAL-05 counts 3 or more shown tags as {n} people", () => {
    const four = [...FAMILY, tag(4, "Dad", "mint")];

    expect(filterLabel(new Set(ALL_IDS), four, LABELS)).toBe("3 people");
  });

  it("CAL-05 is No one when nobody is shown", () => {
    expect(filterLabel(new Set(), FAMILY, LABELS)).toBe("No one");
  });
});

describe("initials", () => {
  it("CAL-05 keeps a name of 3 letters or fewer in full", () => {
    expect(initials("Mom")).toBe("Mom");
    expect(initials("Bo")).toBe("Bo");
  });

  it("CAL-05 takes the first letters of the first two words", () => {
    expect(initials("Minh-An")).toBe("MA");
    expect(initials("grandma rose lee")).toBe("GR");
  });

  it("CAL-05 else takes the first two letters", () => {
    expect(initials("Grandma")).toBe("Gr");
    expect(initials("Đức")).toBe("Đức");
    expect(initials("Đức Anh")).toBe("ĐA");
  });
});

describe("stackCircles", () => {
  const eight = Array.from({ length: 8 }, (_, n) => tag(n + 1, `P${n}`, "lilac"));

  it("CAL-05 shows every tag up to the cap", () => {
    expect(stackCircles(eight, 8)).toEqual({ shown: eight, more: 0 });
  });

  it("CAL-05 past the cap shows one fewer and a +N circle", () => {
    expect(stackCircles(eight, 4)).toEqual({ shown: eight.slice(0, 3), more: 5 });
  });
});

describe("toggleEveryone", () => {
  it("CAL-05 Everyone selects every tag", () => {
    expect(toggleEveryone(new Set([AN.id]), ALL_IDS)).toBe("all");
    expect(toggleEveryone(new Set(), ALL_IDS)).toBe("all");
  });

  it("CAL-05 Everyone clears every tag when all are selected", () => {
    expect(toggleEveryone(new Set(ALL_IDS), ALL_IDS)).toEqual(new Set());
  });
});

describe("filterScope", () => {
  it("CAL-05 is everyone with every tag selected, some with a few, none with nobody", () => {
    expect(filterScope(new Set(ALL_IDS), ALL_IDS)).toBe("everyone");
    expect(filterScope(new Set([MOM.id]), ALL_IDS)).toBe("some");
    expect(filterScope(new Set(), ALL_IDS)).toBe("none");
  });
});

describe("pickWho", () => {
  const ALL = ["a", "b", "c"];

  it("EVT-11 Everyone picks every tag", () => {
    expect(pickWho(["b"], ALL)).toEqual(ALL);
  });

  it("EVT-11 picking a tag adds it in tag order", () => {
    expect(pickWho(["c"], ALL, "a")).toEqual(["a", "c"]);
  });

  it("EVT-11 a tag picked while everyone is on keeps only that tag", () => {
    expect(pickWho(ALL, ALL, "b")).toEqual(["b"]);
  });

  it("EVT-11 unpicking the last tag selects everyone", () => {
    expect(pickWho(["b"], ALL, "b")).toEqual(ALL);
  });

  it("EVT-11 a nobody event picks the tapped tag", () => {
    expect(pickWho([], ALL, "c")).toEqual(["c"]);
  });
});

describe("memberRemoval", () => {
  const plan = (n: number, who: { everyone: boolean; tagIds: string[] }, deletedAt?: string) => ({
    id: `e${n}`,
    ...who,
    ...(deletedAt ? { deletedAt } : {}),
  });

  it("FAM-08 deletes the plans whose only tag it is", () => {
    expect(memberRemoval([plan(1, forTags(MOM)), plan(2, forTags(AN))], MOM.id)).toEqual({
      deleted: ["e1"],
      stripped: [],
    });
  });

  it("FAM-08 takes the tag off plans shared with others", () => {
    expect(memberRemoval([plan(1, forTags(AN, MOM))], MOM.id)).toEqual({
      deleted: [],
      stripped: ["e1"],
    });
  });

  it("FAM-08 leaves everyone and nobody plans untouched", () => {
    expect(memberRemoval([plan(1, everyone), plan(2, nobody)], MOM.id)).toEqual({
      deleted: [],
      stripped: [],
    });
  });

  it("FAM-08 counts past plans too but skips deleted ones", () => {
    const past = { ...plan(1, forTags(MOM)), startAt: "2020-01-01T10:00:00.000Z" };

    const gone = plan(2, forTags(MOM), "2026-10-01T10:00:00.000Z");

    expect(memberRemoval([past, gone], MOM.id)).toEqual({ deleted: ["e1"], stripped: [] });
  });
});

describe("removalLine", () => {
  const labels = {
    deleted: (count: number) => `Their ${count} ${count === 1 ? "plan is" : "plans are"} deleted.`,
    stripped: (count: number) =>
      `They’re taken off ${count} ${count === 1 ? "plan" : "plans"} shared with others.`,
    none: "They have no plans.",
  };

  it("FAM-08 names the deleted and the shared plans, joined by a space", () => {
    expect(removalLine({ deleted: ["a", "b"], stripped: ["c", "d", "e"] }, labels)).toBe(
      "Their 2 plans are deleted. They’re taken off 3 plans shared with others.",
    );
  });

  it("FAM-08 uses the singular for one plan", () => {
    expect(removalLine({ deleted: ["a"], stripped: [] }, labels)).toBe("Their 1 plan is deleted.");
    expect(removalLine({ deleted: [], stripped: ["a"] }, labels)).toBe(
      "They’re taken off 1 plan shared with others.",
    );
  });

  it("FAM-08 says they have no plans with neither", () => {
    expect(removalLine({ deleted: [], stripped: [] }, labels)).toBe("They have no plans.");
  });
});
