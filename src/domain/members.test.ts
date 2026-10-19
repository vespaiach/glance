import {
  eventColor,
  matchesFilter,
  nextFreeColor,
  removalImpact,
  whoLabel,
  withoutMember,
} from "./members";
import { type Member, MemberColorSchema } from "./schemas";

const member = (n: number, name: string, color: Member["color"]): Member => ({
  id: `0192f1a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = member(1, "Minh-An", "lilac");

const HY = member(2, "Minh-Hy", "sky");

const MOM = member(3, "Mom", "coral");

const FAMILY = [AN, HY, MOM];

const everyone = { everyone: true, memberIds: [] };

const forMembers = (...members: Member[]) => ({
  everyone: false,
  memberIds: members.map((one) => one.id),
});

const event = (id: string, who: { everyone: boolean; memberIds: string[] }) => ({
  id,
  title: id,
  startAt: "2026-10-09T16:00:00.000Z",
  ...who,
});

describe("whoLabel", () => {
  it("§7 reads Everyone for an everyone plan", () => {
    expect(whoLabel(everyone, FAMILY, "Everyone")).toBe("Everyone");
  });

  it("§7 joins the names in member order, not the order they were picked", () => {
    expect(whoLabel(forMembers(MOM, AN), FAMILY, "Everyone")).toBe("Minh-An, Mom");
  });

  it("D24 skips ids of members that are gone", () => {
    expect(whoLabel(forMembers(HY, member(9, "Gone", "ice")), FAMILY, "Everyone")).toBe("Minh-Hy");
  });
});

describe("eventColor", () => {
  it("§7 a plan for one member takes that member's color", () => {
    expect(eventColor(forMembers(HY), FAMILY)).toBe("sky");
  });

  it("§7 a plan for several members or everyone takes the season soft color", () => {
    expect(eventColor(forMembers(AN, HY), FAMILY)).toBe("soft");
    expect(eventColor(everyone, FAMILY)).toBe("soft");
  });

  it("D24 a plan whose one member is gone takes the season soft color", () => {
    expect(eventColor(forMembers(member(9, "Gone", "ice")), FAMILY)).toBe("soft");
  });
});

describe("removalImpact", () => {
  const solo = event("solo", forMembers(MOM));

  const shared = event("shared", forMembers(AN, MOM));

  const all = event("all", everyone);

  const other = event("other", forMembers(HY));

  it("FAM-03 deletes plans only for the member and strips shared ones, leaving everyone plans", () => {
    expect(removalImpact(MOM.id, [solo, shared, all, other])).toEqual({
      solo: [solo],
      shared: [shared],
    });
  });

  it("FAM-03 a shared plan loses only the removed member", () => {
    expect(withoutMember(shared, MOM.id)).toEqual({ ...shared, memberIds: [AN.id] });
  });
});

describe("nextFreeColor", () => {
  it("FAM-04 offers the first color no member uses", () => {
    expect(nextFreeColor([AN, MOM])).toBe("sky");
  });

  it("FAM-04 offers the first color again once all 12 are taken", () => {
    const full = MemberColorSchema.options.map((color, index) => member(index + 1, color, color));

    expect(nextFreeColor(full)).toBe("lilac");
  });

  it("FAM-04 a removed member's color is free again", () => {
    expect(nextFreeColor([HY])).toBe("lilac");
  });
});

describe("matchesFilter", () => {
  it("CAL-05 the everyone filter shows every plan", () => {
    expect(matchesFilter(forMembers(MOM), "everyone")).toBe(true);
  });

  it("CAL-05 a plan shows when any selected member is on it", () => {
    expect(matchesFilter(forMembers(AN, MOM), new Set([MOM.id]))).toBe(true);
    expect(matchesFilter(forMembers(AN), new Set([MOM.id]))).toBe(false);
  });

  it("CAL-05 everyone plans always show, and nothing else when nobody is selected", () => {
    expect(matchesFilter(everyone, new Set())).toBe(true);
    expect(matchesFilter(forMembers(AN), new Set())).toBe(false);
  });
});
