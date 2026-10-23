import { act, renderHook, waitFor } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { AccountSettings, Note } from "@/domain/schemas";
import { createNotesRepo, useLastAuthor, useNote, useNotes } from "./notes";
import {
  type Harness,
  openHarness,
  synced,
  TEST_ACCOUNT,
  TEST_NOW,
  wrapperFor,
} from "./testHarness";

const DAY_MS = 24 * 60 * 60 * 1000;

const ago = (ms: number) => new Date(TEST_NOW.getTime() - ms).toISOString();

function note(n: number, createdAt: string): Note {
  return {
    id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
    text: `Note ${n}`,
    author: "Maria",
    createdAt,
    rotation: 0,
  };
}

const FRESH = note(1, ago(DAY_MS / 2));

const OLD = note(2, ago(2 * DAY_MS));

const NEW = note(3, ago(60_000));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-notes-repo-test");
});

afterEach(() => store.close());

function saveExpiry(noteExpiry: AccountSettings["noteExpiry"]) {
  return store.db.settings.put({
    ...synced(DEFAULT_SETTINGS),
    noteExpiry,
    accountId: TEST_ACCOUNT,
  });
}

function renderNotes() {
  return renderHook(() => useNotes(TEST_NOW), { wrapper: wrapperFor(store) });
}

describe("notes repo", () => {
  it("tech§4.2 put writes the row and a put outbox entry, then nudges", async () => {
    await createNotesRepo(store).put(NEW);

    expect(await store.db.notes.get(NEW.id)).toMatchObject({ ...NEW, version: 0 });
    expect(await store.db.outbox.toArray()).toMatchObject([
      { entity: "notes", entityId: NEW.id, op: "put", payload: { ...NEW, version: 0 } },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("tech§4.2 remove marks the row deleted and queues a delete", async () => {
    await store.db.notes.put(synced(FRESH));

    await createNotesRepo(store).remove(FRESH.id);

    expect((await store.db.notes.get(FRESH.id))?.deletedAt).toBe(TEST_NOW.toISOString());
    expect(await store.db.outbox.toArray()).toMatchObject([
      { entity: "notes", entityId: FRESH.id, op: "delete" },
    ]);
  });
});

describe("last author", () => {
  function renderLastAuthor() {
    return renderHook(() => useLastAuthor(), { wrapper: wrapperFor(store) });
  }

  it("NOTE-02 the last author is blank before anyone posts from this screen", async () => {
    const { result } = renderLastAuthor();

    await waitFor(() => expect(result.current).toBe(""));
  });

  it("NOTE-02 posting a note remembers its author on this screen, outside the outbox", async () => {
    const { result } = renderLastAuthor();

    await act(() => createNotesRepo(store).post({ ...NEW, author: "Mia" }));

    await waitFor(() => expect(result.current).toBe("Mia"));
    expect(await store.db.outbox.toArray()).toMatchObject([{ entity: "notes", entityId: NEW.id }]);
  });

  it("NOTE-03 an unsigned post keeps the last author", async () => {
    await createNotesRepo(store).post({ ...NEW, author: "Mia" });
    await createNotesRepo(store).post({ ...FRESH, author: "" });

    const { result } = renderLastAuthor();

    await waitFor(() => expect(result.current).toBe("Mia"));
  });

  it("NOTE-02 saving an edit leaves the last author alone", async () => {
    await createNotesRepo(store).post({ ...NEW, author: "Mia" });
    await createNotesRepo(store).put({ ...FRESH, author: "Leo" });

    const { result } = renderLastAuthor();

    await waitFor(() => expect(result.current).toBe("Mia"));
  });
});

describe("useNotes", () => {
  it("NOTE-04 lists the newest note first", async () => {
    await saveExpiry({ on: false, days: 1 });
    await store.db.notes.bulkPut([synced(OLD), synced(NEW), synced(FRESH)]);

    const { result } = renderNotes();

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([NEW.id, FRESH.id, OLD.id]),
    );
  });

  it("OFF-04 a new note waits to post until its outbox entry drains", async () => {
    await store.db.notes.put(synced(FRESH));

    const { result } = renderNotes();

    await act(() => createNotesRepo(store).put(NEW));

    await waitFor(() =>
      expect(result.current?.map(({ id, waiting }) => ({ id, waiting }))).toEqual([
        { id: NEW.id, waiting: true },
        { id: FRESH.id, waiting: false },
      ]),
    );

    await act(() => store.db.outbox.clear());

    await waitFor(() => expect(result.current?.every((row) => !row.waiting)).toBe(true));
  });

  it("OFF-04 an edit to a posted note doesn't wait to post", async () => {
    await store.db.notes.put(synced(FRESH));

    const { result } = renderNotes();

    await act(() => createNotesRepo(store).put({ ...FRESH, text: "Edited" }));

    await waitFor(() => expect(result.current?.[0]?.text).toBe("Edited"));
    expect(result.current?.[0]?.waiting).toBe(false);
  });

  it("NOTE-08 hides notes past the expiry setting, even offline", async () => {
    await saveExpiry({ on: true, days: 1 });
    await store.db.notes.bulkPut([synced(FRESH), synced(OLD)]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRESH.id]));
  });

  it("NOTE-08 keeps every note when expiry is off", async () => {
    await saveExpiry({ on: false, days: 1 });
    await store.db.notes.bulkPut([synced(FRESH), synced(OLD)]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRESH.id, OLD.id]));
  });

  it("NOTE-08 uses the default expiry when no settings row exists", async () => {
    await store.db.notes.bulkPut([synced(FRESH), synced(note(4, ago(8 * DAY_MS)))]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRESH.id]));
  });

  it("NOTE-01 useNote reads one live note and null once it is removed", async () => {
    await store.db.notes.put(synced(FRESH));

    const { result } = renderHook(() => useNote(FRESH.id), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current?.text).toBe("Note 1"));

    await act(() => createNotesRepo(store).remove(FRESH.id));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("NOTE-10 useNote marks a note that never synced as waiting to post", async () => {
    await createNotesRepo(store).put(NEW);
    await store.db.notes.put(synced(FRESH));

    const { result } = renderHook(() => [useNote(NEW.id), useNote(FRESH.id)], {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current.map((row) => row?.waiting)).toEqual([true, false]));
  });

  it("tech§4.1 hides deleted notes", async () => {
    await store.db.notes.bulkPut([synced(FRESH), { ...synced(NEW), deletedAt: ago(0) }]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRESH.id]));
  });
});
