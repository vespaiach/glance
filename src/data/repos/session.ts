import { useEffect, useState } from "react";
import { FIXTURE_ACCOUNT, FIXTURE_SHEET_TARGETS, fixturePhotoImage } from "@/fixtures/data";
import { type FixtureParams, parseFixtureParams } from "@/fixtures/params";
import { accountDbName, FIXTURE_DB_NAME, openGlanceDb } from "../db";
import { openMetaDb, readSignedInAccount } from "../meta";
import { createFixtureTransport, seedFixtureDb } from "../sync/fixtureTransport";
import { createInlineSyncHost } from "../sync/host";
import { apiPhotoSrc } from "./photos";
import type { PhotoVariant, RepoStore } from "./store";

export type { FixtureParams };

export const fixtureSheetTargets = FIXTURE_SHEET_TARGETS;

export type DisplayBoot =
  | { kind: "booting" }
  | { kind: "signed-out" }
  | { kind: "ready"; store: RepoStore };

type BootOptions = { demo: boolean; params: FixtureParams; now: () => Date };

type OpenedDisplay = { boot: DisplayBoot; close(): void };

const SIGNED_OUT: OpenedDisplay = { boot: { kind: "signed-out" }, close: () => {} };

const noNudge = () => {};

const fixturePhotoSrc = (photoId: string, variant: PhotoVariant) =>
  fixturePhotoImage(photoId) ?? apiPhotoSrc(photoId, variant);

export function fixtureParamsFor(demo: boolean, search: string): FixtureParams {
  return demo ? parseFixtureParams(search) : {};
}

async function openFixtureDisplay(params: FixtureParams, now: () => Date): Promise<OpenedDisplay> {
  const db = openGlanceDb(FIXTURE_DB_NAME);

  const host = createInlineSyncHost({
    db,
    transport: createFixtureTransport({ db, params, now }),
    now,
  });

  let closed = false;

  const close = () => {
    closed = true;
    host.stop();
    db.close();
  };

  await seedFixtureDb(db, params).catch((error: unknown) => {
    close();

    throw error;
  });

  host.start(FIXTURE_ACCOUNT.id).catch((error: unknown) => {
    if (!closed) throw error;
  });

  const store = {
    db,
    accountId: FIXTURE_ACCOUNT.id,
    now,
    nudge: host.nudge,
    photoSrc: fixturePhotoSrc,
  };

  return { boot: { kind: "ready", store }, close };
}

async function openAccountDisplay(now: () => Date): Promise<OpenedDisplay> {
  const meta = openMetaDb();

  const account = await readSignedInAccount(meta).finally(() => meta.close());

  if (account === undefined) return SIGNED_OUT;

  const db = openGlanceDb(accountDbName(account.accountId));

  const store = {
    db,
    accountId: account.accountId,
    now,
    nudge: noNudge,
    photoSrc: apiPhotoSrc,
  };

  return { boot: { kind: "ready", store }, close: () => db.close() };
}

export function useDisplayBoot({ demo, params, now }: BootOptions): DisplayBoot {
  const [boot, setBoot] = useState<DisplayBoot>({ kind: "booting" });

  useEffect(() => {
    let live = true;

    const opening = demo ? openFixtureDisplay(params, now) : openAccountDisplay(now);

    opening.then(
      (opened) => {
        if (live) setBoot(opened.boot);
      },
      (error: unknown) => {
        if (live) throw error;
      },
    );

    return () => {
      live = false;

      opening.then(
        (opened) => opened.close(),
        () => {},
      );
    };
  }, [demo, params, now]);

  return boot;
}
