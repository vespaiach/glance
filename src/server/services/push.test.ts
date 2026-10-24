import { subscribePush, unsubscribePush } from "./push";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const PHONE = { endpoint: "https://push.example.com/phone", keys: { p256dh: "p1", auth: "a1" } };

const TABLET = { endpoint: "https://push.example.com/tablet", keys: { p256dh: "p2", auth: "a2" } };

async function addDisplay(id: string, accountId: string): Promise<void> {
  await harness.deps().db.displays.insert({
    id,
    accountId,
    kind: "smartphone",
    browser: "Safari",
    lastSeenAt: "2026-10-09T14:00:00.000Z",
  });
}

async function endpoints(accountId: string): Promise<string[]> {
  const saved = await harness.deps().db.pushSubscriptions.forAccount(accountId);

  return saved.map((subscription) => subscription.endpoint);
}

beforeEach(async () => {
  await addDisplay("maria-phone", MARIA);
  await addDisplay("maria-tablet", MARIA);
  await addDisplay("omar-phone", OMAR);
});

describe("subscribePush", () => {
  it("NOTIF-07 stores this display's subscription for the account", async () => {
    await subscribePush(harness.deps(), MARIA, "maria-phone", PHONE);

    expect(await harness.deps().db.pushSubscriptions.forAccount(MARIA)).toEqual([
      expect.objectContaining({
        accountId: MARIA,
        displayId: "maria-phone",
        endpoint: PHONE.endpoint,
        keys: PHONE.keys,
        createdAt: "2026-10-09T14:00:00.000Z",
      }),
    ]);
  });

  it("NOTIF-07 keeps one row when the same subscription comes again with new keys", async () => {
    await subscribePush(harness.deps(), MARIA, "maria-phone", PHONE);
    await subscribePush(harness.deps(), MARIA, "maria-phone", {
      ...PHONE,
      keys: { p256dh: "p9", auth: "a9" },
    });

    const saved = await harness.deps().db.pushSubscriptions.forAccount(MARIA);

    expect(saved.map(({ keys }) => keys)).toEqual([{ p256dh: "p9", auth: "a9" }]);
  });

  it("NOTIF-08 replaces the display's old subscription with its new one", async () => {
    await subscribePush(harness.deps(), MARIA, "maria-phone", PHONE);
    await subscribePush(harness.deps(), MARIA, "maria-phone", TABLET);

    expect(await endpoints(MARIA)).toEqual([TABLET.endpoint]);
  });

  it("NOTIF-07 keeps each display's subscription", async () => {
    await subscribePush(harness.deps(), MARIA, "maria-phone", PHONE);
    await subscribePush(harness.deps(), MARIA, "maria-tablet", TABLET);

    expect((await endpoints(MARIA)).sort()).toEqual([PHONE.endpoint, TABLET.endpoint]);
  });

  it("tech§6.1 lists no subscription of another account", async () => {
    await subscribePush(harness.deps(), MARIA, "maria-phone", PHONE);

    expect(await endpoints(OMAR)).toEqual([]);
  });
});

describe("unsubscribePush", () => {
  it("NOTIF-08 removes this display's subscription only", async () => {
    await subscribePush(harness.deps(), MARIA, "maria-phone", PHONE);
    await subscribePush(harness.deps(), MARIA, "maria-tablet", TABLET);

    await unsubscribePush(harness.deps(), MARIA, "maria-phone");

    expect(await endpoints(MARIA)).toEqual([TABLET.endpoint]);
  });

  it("tech§6.1 can't remove another account's subscription", async () => {
    await subscribePush(harness.deps(), MARIA, "maria-phone", PHONE);

    await unsubscribePush(harness.deps(), OMAR, "maria-phone");

    expect(await endpoints(MARIA)).toEqual([PHONE.endpoint]);
  });
});
