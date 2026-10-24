import "server-only";
import type {
  AccountSettings,
  CalendarEvent,
  Note,
  Photo,
  Synced,
  Tag,
  Weather,
} from "@/domain/schemas";
import type { Browser, DeviceKind } from "@/domain/screens";

export type DatabaseConfig = { kind: "postgres"; url: string } | { kind: "memory" };

export type OpenedDatabase = { db: Database; prepare: () => Promise<void> };

export type Owned<T> = { accountId: string; value: T };

export type StoredEvent = Synced<CalendarEvent>;

export type StoredNote = Synced<Note>;

export type StoredTag = Synced<Tag>;

export type StoredPhoto = Synced<Photo>;

export type StoredSettings = Synced<AccountSettings> & { accountId: string };

export type AccountRecord = {
  id: string;
  email: string;
  name: string | null;
  timeZone: string;
  setupDoneAt: string | null;
  createdAt: string;
};

export type DisplayRecord = {
  id: string;
  accountId: string;
  kind: DeviceKind;
  browser: Browser | null;
  lastSeenAt: string;
};

type SessionRecord = { tokenHash: string; displayId: string; createdAt: string };

export type SessionDisplay = { displayId: string; accountId: string; createdAt: string };

export type SignInCodeRecord = {
  email: string;
  codeHash: string;
  timeZone: string;
  tries: number;
  expiresAt: string;
};

export type MagicLinkRecord = {
  tokenHash: string;
  accountId: string;
  displayId: string;
  expiresAt: string;
  usedAt: string | null;
};

type WeatherCacheRecord = { location: string; weather: Weather; fetchedAt: string };

export type Repos = {
  versions: {
    current(): Promise<number>;
    next(): Promise<number>;
  };
  accounts: {
    byId(id: string): Promise<AccountRecord | undefined>;
    byEmail(email: string): Promise<AccountRecord | undefined>;
    insert(account: AccountRecord): Promise<void>;
    rename(id: string, name: string): Promise<void>;
    finishSetup(id: string, at: string): Promise<void>;
  };
  displays: {
    insert(display: DisplayRecord): Promise<void>;
    forAccount(accountId: string): Promise<DisplayRecord[]>;
    seen(id: string, at: string): Promise<void>;
    remove(id: string): Promise<void>;
  };
  sessions: {
    insert(session: SessionRecord): Promise<void>;
    find(tokenHash: string): Promise<SessionDisplay | undefined>;
    removeForDisplay(displayId: string): Promise<void>;
  };
  signInCodes: {
    get(email: string): Promise<SignInCodeRecord | undefined>;
    put(code: SignInCodeRecord): Promise<void>;
    remove(email: string): Promise<void>;
    removeExpired(before: string): Promise<void>;
  };
  magicLinks: {
    get(tokenHash: string): Promise<MagicLinkRecord | undefined>;
    insert(link: MagicLinkRecord): Promise<void>;
    markUsed(tokenHash: string, at: string): Promise<void>;
    remove(tokenHash: string): Promise<void>;
    removeUnusedFor(displayId: string): Promise<void>;
    removeExpired(before: string): Promise<void>;
  };
  events: {
    find(id: string): Promise<Owned<StoredEvent> | undefined>;
    save(accountId: string, event: StoredEvent): Promise<void>;
    changedSince(accountId: string, version: number): Promise<StoredEvent[]>;
  };
  notes: {
    find(id: string): Promise<Owned<StoredNote> | undefined>;
    save(accountId: string, note: StoredNote): Promise<void>;
    live(): Promise<Owned<StoredNote>[]>;
    changedSince(accountId: string, version: number): Promise<StoredNote[]>;
  };
  tags: {
    find(id: string): Promise<Owned<StoredTag> | undefined>;
    save(accountId: string, tag: StoredTag): Promise<void>;
    hasAny(accountId: string): Promise<boolean>;
    liveIds(accountId: string, ids: readonly string[]): Promise<Set<string>>;
    liveByName(accountId: string, name: string): Promise<StoredTag | undefined>;
    changedSince(accountId: string, version: number): Promise<StoredTag[]>;
  };
  photos: {
    find(accountId: string, id: string): Promise<StoredPhoto | undefined>;
    insert(accountId: string, photo: StoredPhoto, filePath: string): Promise<void>;
    save(accountId: string, photo: StoredPhoto): Promise<void>;
    livePath(accountId: string, id: string): Promise<string | undefined>;
    livePaths(): Promise<string[]>;
    deletedPaths(): Promise<string[]>;
    filesRemoved(filePath: string): Promise<void>;
    changedSince(accountId: string, version: number): Promise<StoredPhoto[]>;
  };
  settings: {
    get(accountId: string): Promise<StoredSettings | undefined>;
    save(settings: StoredSettings): Promise<void>;
    all(): Promise<StoredSettings[]>;
    changedSince(accountId: string, version: number): Promise<StoredSettings[]>;
  };
  weatherCache: {
    get(accountId: string): Promise<WeatherCacheRecord | undefined>;
    put(accountId: string, entry: WeatherCacheRecord): Promise<void>;
  };
};

export type Database = Repos & { tx<T>(fn: (db: Database) => Promise<T>): Promise<T> };
