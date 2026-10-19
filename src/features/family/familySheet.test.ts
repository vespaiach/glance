import type { Member } from "@/domain/schemas";
import {
  familyRows,
  familySheetReducer,
  initialFamilySheet,
  isDirty,
  shownColor,
} from "./familySheet";

const member = (n: number, name: string, color: Member["color"]): Member => ({
  id: `member-${n}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const AN = member(1, "Minh-An", "lilac");

const MOM = member(2, "Mom", "sky");

const DAD = member(3, "Dad", "coral");

const plan = (...members: Member[]) => ({
  everyone: false,
  memberIds: members.map((one) => one.id),
});

const EVERYONE = { everyone: true, memberIds: [] };

describe("initialFamilySheet", () => {
  it("FAM-01 opens on the list with an empty add draft", () => {
    expect(initialFamilySheet()).toEqual({
      removing: null,
      name: "",
      color: null,
      error: null,
      confirm: null,
    });
  });

  it("FAM-03 rm= opens the remove confirm for that member", () => {
    expect(initialFamilySheet({ removing: AN.id }).removing).toBe(AN.id);
  });

  it("FAM-04 famerr=1 shows Already in the family with a typed name, else Add a name", () => {
    expect(initialFamilySheet({ name: "Bao", error: true })).toMatchObject({
      name: "Bao",
      error: "taken",
    });
    expect(initialFamilySheet({ error: true }).error).toBe("empty");
  });

  it("FAM-06 discard=1 opens asking Discard changes?", () => {
    expect(initialFamilySheet({ name: "Bao", discard: true }).confirm).toBe("discard");
  });
});

describe("familySheetReducer", () => {
  const start = initialFamilySheet();

  it("FAM-03 Remove asks under that row and Cancel closes the confirm", () => {
    const asking = familySheetReducer(start, { type: "askRemove", id: MOM.id });

    expect(asking.removing).toBe(MOM.id);
    expect(familySheetReducer(asking, { type: "keepMember" }).removing).toBeNull();
  });

  it("FAM-03 a removal closes the confirm", () => {
    const asking = familySheetReducer(start, { type: "askRemove", id: MOM.id });

    expect(familySheetReducer(asking, { type: "removed" }).removing).toBeNull();
  });

  it("FAM-04 an invalid add shows its error and the next keystroke clears it", () => {
    const invalid = familySheetReducer(start, { type: "invalid", error: "empty" });

    expect(invalid.error).toBe("empty");
    expect(familySheetReducer(invalid, { type: "name", value: "B" })).toMatchObject({
      name: "B",
      error: null,
    });
  });

  it("FAM-04 an add clears the name, color and error", () => {
    const typed = familySheetReducer(familySheetReducer(start, { type: "name", value: "Bao" }), {
      type: "color",
      value: "mint",
    });

    expect(familySheetReducer(typed, { type: "added" })).toEqual(start);
  });

  it("FAM-06 Discard changes? asks, Keep editing returns and typing dismisses it", () => {
    const asking = familySheetReducer(start, { type: "askDiscard" });

    expect(asking.confirm).toBe("discard");
    expect(familySheetReducer(asking, { type: "keepEditing" }).confirm).toBeNull();
    expect(familySheetReducer(asking, { type: "name", value: "Ba" }).confirm).toBeNull();
  });
});

describe("shownColor", () => {
  it("FAM-04 preselects the first free color", () => {
    expect(shownColor(null, [AN, MOM])).toBe("coral");
  });

  it("FAM-04 keeps a picked color while it is free", () => {
    expect(shownColor("mint", [AN, MOM])).toBe("mint");
  });

  it("FAM-04 falls back to the first free color once the picked one is taken", () => {
    expect(shownColor("coral", [AN, MOM, DAD])).toBe("mint");
  });
});

describe("isDirty", () => {
  it("FAM-06 only a typed name not added is a change", () => {
    expect(isDirty(initialFamilySheet())).toBe(false);
    expect(isDirty(initialFamilySheet({ name: "  " }))).toBe(false);
    expect(isDirty(initialFamilySheet({ name: "Bao" }))).toBe(true);
  });
});

describe("familyRows", () => {
  it("FAM-02 counts each member's solo and shared plans; everyone plans are not theirs", () => {
    const events = [plan(MOM), plan(MOM), plan(AN, MOM), EVERYONE, plan(AN, DAD)];

    expect(familyRows([AN, MOM, DAD], events)).toEqual([
      { member: AN, solo: 0, shared: 2 },
      { member: MOM, solo: 2, shared: 1 },
      { member: DAD, solo: 0, shared: 1 },
    ]);
  });
});
