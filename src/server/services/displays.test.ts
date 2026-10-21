import type { Browser, DeviceKind } from "@/domain/screens";
import { listDisplays } from "./displays";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

type Seen = {
  id: string;
  account: string;
  kind?: DeviceKind;
  browser?: Browser | null;
  seen: string;
};

async function addDisplays(displays: Seen[]): Promise<void> {
  for (const { id, account, kind = "monitor", browser = null, seen } of displays) {
    await harness
      .deps()
      .db.displays.insert({ id, accountId: account, kind, browser, lastSeenAt: seen });
  }
}

describe("listDisplays", () => {
  it("SET-12 lists the account's screens, this one first, then the newest first", async () => {
    await addDisplays([
      {
        id: "phone",
        account: MARIA,
        kind: "smartphone",
        browser: "Safari",
        seen: "2026-10-02T18:30:00.000Z",
      },
      { id: "kitchen", account: MARIA, browser: "Chrome", seen: "2026-10-09T14:00:00.000Z" },
      { id: "hallway", account: MARIA, browser: "Edge", seen: "2026-10-09T13:48:00.000Z" },
      { id: "tablet", account: MARIA, kind: "tablet", seen: "2026-10-08T20:15:00.000Z" },
    ]);

    const listed = await listDisplays(harness.deps(), MARIA, "tablet");

    expect(listed).toEqual([
      {
        id: "tablet",
        kind: "tablet",
        browser: null,
        lastSeenAt: "2026-10-08T20:15:00.000Z",
        current: true,
      },
      {
        id: "kitchen",
        kind: "monitor",
        browser: "Chrome",
        lastSeenAt: "2026-10-09T14:00:00.000Z",
        current: false,
      },
      {
        id: "hallway",
        kind: "monitor",
        browser: "Edge",
        lastSeenAt: "2026-10-09T13:48:00.000Z",
        current: false,
      },
      {
        id: "phone",
        kind: "smartphone",
        browser: "Safari",
        lastSeenAt: "2026-10-02T18:30:00.000Z",
        current: false,
      },
    ]);
  });

  it("SET-12 never lists another account's screens", async () => {
    await addDisplays([
      { id: "maria", account: MARIA, seen: "2026-10-09T14:00:00.000Z" },
      { id: "omar", account: OMAR, seen: "2026-10-09T14:00:00.000Z" },
    ]);

    const listed = await listDisplays(harness.deps(), MARIA, "omar");

    expect(listed.map((display) => display.id)).toEqual(["maria"]);
  });
});
