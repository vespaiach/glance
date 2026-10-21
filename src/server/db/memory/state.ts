import "server-only";
import type {
  AccountRecord,
  DisplayRecord,
  MagicLinkRecord,
  Owned,
  SessionRecord,
  SignInCodeRecord,
  StoredEvent,
  StoredNote,
  StoredPhoto,
  StoredSettings,
  StoredTag,
  WeatherCacheRecord,
} from "../database";

export type State = {
  version: number;
  accounts: Map<string, AccountRecord>;
  displays: Map<string, DisplayRecord>;
  sessions: Map<string, SessionRecord>;
  signInCodes: Map<string, SignInCodeRecord>;
  magicLinks: Map<string, MagicLinkRecord>;
  events: Map<string, Owned<StoredEvent>>;
  notes: Map<string, Owned<StoredNote>>;
  tags: Map<string, Owned<StoredTag>>;
  photos: Map<string, Owned<StoredPhoto> & { filePath: string }>;
  settings: Map<string, StoredSettings>;
  weatherCache: Map<string, WeatherCacheRecord>;
};

export type ReadState = () => State;

export function emptyState(): State {
  return {
    version: 0,
    accounts: new Map(),
    displays: new Map(),
    sessions: new Map(),
    signInCodes: new Map(),
    magicLinks: new Map(),
    events: new Map(),
    notes: new Map(),
    tags: new Map(),
    photos: new Map(),
    settings: new Map(),
    weatherCache: new Map(),
  };
}

export function copy<T>(value: T): T {
  return structuredClone(value);
}

export function byVersion<T extends { version: number }>(a: T, b: T): number {
  return a.version - b.version;
}

export function changedSince<T extends { version: number }>(
  records: Iterable<Owned<T>>,
  accountId: string,
  version: number,
): T[] {
  return [...records]
    .filter((record) => record.accountId === accountId && record.value.version > version)
    .map((record) => copy(record.value))
    .sort(byVersion);
}
