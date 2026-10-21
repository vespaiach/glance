import "server-only";
import type { Repos } from "../database";
import { copy, type ReadState } from "./state";

export function accountsRepo(state: ReadState): Repos["accounts"] {
  return {
    byId: async (id) => copy(state().accounts.get(id)),
    byEmail: async (email) =>
      copy([...state().accounts.values()].find((account) => sameEmail(account.email, email))),
    insert: async (account) => {
      if (emailTaken(state, account.email) || state().accounts.has(account.id)) {
        throw new Error(`Account ${account.id} or ${account.email} already exists`);
      }

      state().accounts.set(account.id, copy(account));
    },
    rename: async (id, name) => {
      const account = state().accounts.get(id);

      if (account) account.name = name;
    },
    finishSetup: async (id, at) => {
      const account = state().accounts.get(id);

      if (account && account.setupDoneAt === null) account.setupDoneAt = at;
    },
  };
}

export function displaysRepo(state: ReadState): Repos["displays"] {
  return {
    insert: async (display) => {
      state().displays.set(display.id, copy(display));
    },
    forAccount: async (accountId) =>
      [...state().displays.values()]
        .filter((display) => display.accountId === accountId)
        .map(copy)
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
    seen: async (id, at) => {
      const display = state().displays.get(id);

      if (display) display.lastSeenAt = at;
    },
    remove: async (id) => {
      state().displays.delete(id);
      removeWhere(state().magicLinks, (link) => link.displayId === id);
    },
  };
}

export function sessionsRepo(state: ReadState): Repos["sessions"] {
  return {
    insert: async (session) => {
      state().sessions.set(session.tokenHash, copy(session));
    },
    find: async (tokenHash) => {
      const session = state().sessions.get(tokenHash);

      const display = session && state().displays.get(session.displayId);

      return (
        session &&
        display && {
          displayId: session.displayId,
          accountId: display.accountId,
          createdAt: session.createdAt,
        }
      );
    },
    removeForDisplay: async (displayId) => {
      removeWhere(state().sessions, (session) => session.displayId === displayId);
    },
  };
}

export function signInCodesRepo(state: ReadState): Repos["signInCodes"] {
  return {
    get: async (email) => copy(state().signInCodes.get(email)),
    put: async (code) => {
      state().signInCodes.set(code.email, copy(code));
    },
    remove: async (email) => {
      state().signInCodes.delete(email);
    },
    removeExpired: async (before) => {
      removeWhere(state().signInCodes, (code) => code.expiresAt < before);
    },
  };
}

export function magicLinksRepo(state: ReadState): Repos["magicLinks"] {
  return {
    get: async (tokenHash) => copy(state().magicLinks.get(tokenHash)),
    insert: async (link) => {
      state().magicLinks.set(link.tokenHash, copy(link));
    },
    markUsed: async (tokenHash, at) => {
      const link = state().magicLinks.get(tokenHash);

      if (link) link.usedAt = at;
    },
    remove: async (tokenHash) => {
      state().magicLinks.delete(tokenHash);
    },
    removeUnusedFor: async (displayId) => {
      removeWhere(
        state().magicLinks,
        (link) => link.displayId === displayId && link.usedAt === null,
      );
    },
    removeExpired: async (before) => {
      removeWhere(state().magicLinks, (link) => link.expiresAt < before);
    },
  };
}

function sameEmail(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function emailTaken(state: ReadState, email: string): boolean {
  return [...state().accounts.values()].some((account) => sameEmail(account.email, email));
}

function removeWhere<T>(records: Map<string, T>, matches: (record: T) => boolean): void {
  for (const [key, record] of records) if (matches(record)) records.delete(key);
}
