import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { FIXTURE_ACCOUNT, FIXTURE_EVENTS, FIXTURE_NOW } from "@/fixtures/data";
import { accountDbName, deleteGlanceDb, FIXTURE_DB_NAME } from "../db";
import { deleteMetaDb, openMetaDb, saveSignedInAccount } from "../meta";
import { type DisplayBoot, fixtureParamsFor, useDisplayBoot } from "./session";

const ACCOUNT = {
  accountId: "0195f0a0-0000-7000-8000-00000000000a",
  name: "Maria",
  email: "maria@example.com",
};

const now = () => FIXTURE_NOW;

const params = {};

afterEach(async () => {
  cleanup();

  await deleteMetaDb();
  await deleteGlanceDb(FIXTURE_DB_NAME);
  await deleteGlanceDb(accountDbName(ACCOUNT.accountId));
});

function readyStore(boot: DisplayBoot) {
  if (boot.kind !== "ready") throw new Error(`expected ready, got ${boot.kind}`);

  return boot.store;
}

describe("useDisplayBoot", () => {
  it("tech§6.5 a demo build opens the seeded fixture DB without reading glance-meta", async () => {
    const { result } = renderHook(() => useDisplayBoot({ demo: true, params, now }));

    expect(result.current.kind).toBe("booting");

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    const store = readyStore(result.current);

    expect(store.accountId).toBe(FIXTURE_ACCOUNT.id);
    expect(store.db.name).toBe(FIXTURE_DB_NAME);
    expect(await store.db.events.count()).toBe(FIXTURE_EVENTS.length);
  });

  it("tech§4.5 a screen with no glance-meta entry is signed out", async () => {
    const { result } = renderHook(() => useDisplayBoot({ demo: false, params, now }));

    await waitFor(() => expect(result.current.kind).toBe("signed-out"));
  });

  it("tech§4.5 a glance-meta entry opens that account's DB", async () => {
    const meta = openMetaDb();

    await saveSignedInAccount(meta, ACCOUNT);

    meta.close();

    const { result } = renderHook(() => useDisplayBoot({ demo: false, params, now }));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    const store = readyStore(result.current);

    expect(store.accountId).toBe(ACCOUNT.accountId);
    expect(store.db.name).toBe(accountDbName(ACCOUNT.accountId));
  });

  it("tech§4.5 unmounting closes the DB it opened", async () => {
    const { result, unmount } = renderHook(() => useDisplayBoot({ demo: true, params, now }));

    await waitFor(() => expect(result.current.kind).toBe("ready"));

    const store = readyStore(result.current);

    unmount();

    await waitFor(() => expect(store.db.isOpen()).toBe(false));
  });
});

describe("fixtureParamsFor", () => {
  it("tech§6.5 reads fixture params in demo builds only", () => {
    const search = "?season=winter&clock=24";

    expect(fixtureParamsFor(true, search)).toEqual({ season: "winter", clock: "24h" });
    expect(fixtureParamsFor(false, search)).toEqual({});
  });
});
