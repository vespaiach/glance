import {
  clearSignedInAccount,
  deleteMetaDb,
  markSignedOut,
  openMetaDb,
  readSignedInAccount,
  saveSignedInAccount,
} from "./meta";

const ACCOUNT = {
  accountId: "0195f0a0-0000-7000-8000-00000000000a",
  name: "The Parkers",
  email: "parkers@example.com",
};

const OTHER = {
  accountId: "0195f0a0-0000-7000-8000-00000000000b",
  name: null,
  email: "other@example.com",
};

afterEach(async () => {
  await deleteMetaDb();
});

describe("glance-meta", () => {
  it("tech§4.5 opens the glance-meta database", async () => {
    const db = openMetaDb();

    await db.open();

    expect(db.name).toBe("glance-meta");
    db.close();
  });

  it("tech§4.5 has no signed-in account before sign-in", async () => {
    const db = openMetaDb();

    expect(await readSignedInAccount(db)).toBeUndefined();
    db.close();
  });

  it("tech§4.5 reads back the account saved after sign-in, after a reopen", async () => {
    const db = openMetaDb();
    await saveSignedInAccount(db, ACCOUNT);
    db.close();

    const reopened = openMetaDb();

    expect(await readSignedInAccount(reopened)).toEqual(ACCOUNT);
    reopened.close();
  });

  it("tech§4.5 a different account signing in replaces the previous entry", async () => {
    const db = openMetaDb();
    await saveSignedInAccount(db, ACCOUNT);

    await saveSignedInAccount(db, OTHER);

    expect(await readSignedInAccount(db)).toEqual(OTHER);
    expect(await db.account.count()).toBe(1);
    db.close();
  });

  it("tech§4.5 sign-out clears the entry", async () => {
    const db = openMetaDb();
    await saveSignedInAccount(db, ACCOUNT);

    await clearSignedInAccount(db);

    expect(await readSignedInAccount(db)).toBeUndefined();
    db.close();
  });

  it("SIGNIN-13 signed out by the server keeps the entry with its email", async () => {
    const db = openMetaDb();
    await saveSignedInAccount(db, ACCOUNT);

    await markSignedOut(db);

    expect(await readSignedInAccount(db)).toEqual({ ...ACCOUNT, signedOut: true });
    db.close();
  });

  it("SIGNIN-13 signed out with no entry stays empty", async () => {
    const db = openMetaDb();

    await markSignedOut(db);

    expect(await readSignedInAccount(db)).toBeUndefined();
    db.close();
  });

  it("SIGNIN-13 a finished sign-in clears signed out", async () => {
    const db = openMetaDb();
    await saveSignedInAccount(db, ACCOUNT);
    await markSignedOut(db);

    await saveSignedInAccount(db, ACCOUNT);

    expect(await readSignedInAccount(db)).toEqual(ACCOUNT);
    db.close();
  });
});
