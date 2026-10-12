import { act, renderHook, waitFor } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Note } from "@/domain/schemas";
import { createNotesRepo, useNotes } from "./notes";
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
    tone: 1,
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

function saveExpiry(noteExpiry: "1d" | "1w" | null) {
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

describe("useNotes", () => {
  it("OFF-04 a new note is pending until its outbox entry drains", async () => {
    await store.db.notes.put(synced(FRESH));

    const { result } = renderNotes();

    await act(() => createNotesRepo(store).put(NEW));

    await waitFor(() =>
      expect(result.current?.map(({ id, pending }) => ({ id, pending }))).toEqual([
        { id: FRESH.id, pending: false },
        { id: NEW.id, pending: true },
      ]),
    );

    await act(() => store.db.outbox.clear());

    await waitFor(() => expect(result.current?.every((row) => !row.pending)).toBe(true));
  });

  it("NOTE-08 hides notes past the expiry setting, even offline", async () => {
    await saveExpiry("1d");
    await store.db.notes.bulkPut([synced(FRESH), synced(OLD)]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRESH.id]));
  });

  it("NOTE-08 keeps every note when expiry is off", async () => {
    await saveExpiry(null);
    await store.db.notes.bulkPut([synced(FRESH), synced(OLD)]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([OLD.id, FRESH.id]));
  });

  it("NOTE-08 uses the default expiry when no settings row exists", async () => {
    await store.db.notes.bulkPut([synced(FRESH), synced(note(4, ago(8 * DAY_MS)))]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRESH.id]));
  });

  it("tech§4.1 hides deleted notes", async () => {
    await store.db.notes.bulkPut([synced(FRESH), { ...synced(NEW), deletedAt: ago(0) }]);

    const { result } = renderNotes();

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRESH.id]));
  });
});
