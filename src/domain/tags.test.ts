import { type Tag, TagColorSchema } from "./schemas";
import {
  eventColor,
  exactTag,
  filterTagIds,
  liveFilter,
  matchesFilter,
  nextFreeColor,
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
