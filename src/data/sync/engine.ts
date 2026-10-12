import { err, ok, type Result } from "@/domain/result";
import { retryDelayMs } from "@/domain/retry";
import type { WeatherLocation } from "@/domain/schemas";
import { CURSOR_KEY, type GlanceDb, type OutboxEntry, type SyncedEntity } from "../db";
import { recordStatus, type StatusEvent, type SyncError } from "./status";
import type { Change, PullResponse, Transport, TransportError } from "./transport";

export const WEATHER_REFRESH_MS = 15 * 60_000;

export type SyncResult = Result<void, TransportError>;

export type SyncEngine = {
  start(): Promise<void>;
  nudge(): Promise<SyncResult>;
  resync(): Promise<SyncResult>;
  refreshWeather(): Promise<SyncResult>;
  retrying(): boolean;
  stop(): void;
};

type Options = {
  db: GlanceDb;
  transport: Transport;
  accountId: string;
  now: () => Date;
  photosChanged?: (ids: string[]) => void;
};

type Halt = Extract<SyncError, "unauthorized" | "outdated">;

const DONE: SyncResult = ok(undefined);

function isHalt(error: TransportError): error is Halt {
  return error === "unauthorized" || error === "outdated";
}

function reported(error: TransportError): Exclude<TransportError, "invalid"> {
  return error === "invalid" ? "server" : error;
}

function rowKey(change: Change): string {
  return change.entity === "settings" ? change.row.accountId : change.row.id;
}

function placeKey(location: WeatherLocation | undefined): string | undefined {
  return location && `${location.lat},${location.lon}`;
}

function serialQueue() {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task);

    tail = run.catch(() => undefined);

    return run;
  };
}

async function isPending(db: GlanceDb, entity: SyncedEntity, id: string): Promise<boolean> {
  const count = await db.outbox
    .where("entityId")
    .equals(id)
    .and((entry) => entry.entity === entity)
    .count();

  return count > 0;
}

async function applyChange(db: GlanceDb, change: Change): Promise<void> {
  if (await isPending(db, change.entity, rowKey(change))) return;

  await db.table(change.entity).put(change.row);
}

function settle(db: GlanceDb, entry: OutboxEntry, change: Change): Promise<void> {
  return db.transaction("rw", db.outbox, db.table(entry.entity), async () => {
    await db.outbox.delete(entry.seq);

    await applyChange(db, change);
  });
}

function discard(db: GlanceDb, entry: OutboxEntry): Promise<void> {
  return db.transaction("rw", db.outbox, db.table(entry.entity), async () => {
    await db.outbox.delete(entry.seq);

    if (!(await isPending(db, entry.entity, entry.entityId))) {
      await db.table(entry.entity).delete(entry.entityId);
    }
  });
}

async function readLocation(db: GlanceDb, accountId: string) {
  return (await db.settings.get(accountId))?.weatherLocation;
}

async function serverPlace(db: GlanceDb, accountId: string): Promise<string | undefined> {
  if (await isPending(db, "settings", accountId)) return undefined;

  return placeKey(await readLocation(db, accountId));
}

function livePhotoIds(changes: Change[]): string[] {
  return changes.flatMap((change) =>
    change.entity === "photos" && !change.row.deletedAt ? [change.row.id] : [],
  );
}

function savedPhotoIds(db: GlanceDb): Promise<string[]> {
  return db.photos
    .filter((photo) => !photo.deletedAt)
    .primaryKeys()
    .then((ids) => ids as string[]);
}

function applyPull(db: GlanceDb, response: PullResponse): Promise<void> {
  const tables = [db.events, db.notes, db.photos, db.settings, db.outbox, db.meta];

  return db.transaction("rw", tables, async () => {
    for (const change of response.changes) await applyChange(db, change);

    await db.meta.put({ key: CURSOR_KEY, value: response.cursor });
  });
}

export function createSyncEngine({
  db,
  transport,
  accountId,
  now,
  photosChanged = () => {},
}: Options): SyncEngine {
  const syncQueue = serialQueue();

  const weatherQueue = serialQueue();

  let halted: Halt | undefined;

  let stopped = false;

  let fromScratch = false;

  let weatherTimer: ReturnType<typeof setTimeout> | undefined;

  let weatherFailures = 0;

  let syncTimer: ReturnType<typeof setTimeout> | undefined;

  let syncFailures = 0;

  let fetchedPlace: string | undefined;

  const record = (event: StatusEvent) => recordStatus(db, event);

  const reportPhotos = (ids: string[]) => {
    if (ids.length > 0) photosChanged(ids);
  };

  const clearWeatherTimer = () => {
    clearTimeout(weatherTimer);

    weatherTimer = undefined;
  };

  const clearSyncTimer = () => {
    clearTimeout(syncTimer);

    syncTimer = undefined;
  };

  const scheduleSyncRetry = (): string | undefined => {
    if (stopped) return undefined;

    syncFailures += 1;

    const delayMs = retryDelayMs(syncFailures);

    syncTimer = setTimeout(() => void nudge(), delayMs);

    return new Date(now().getTime() + delayMs).toISOString();
  };

  const fail = async (error: TransportError) => {
    if (isHalt(error)) {
      halted = error;

      clearWeatherTimer();

      return record({ type: "failed", error: reported(error) });
    }

    const retryAt = scheduleSyncRetry();

    await record({ type: "failed", error: reported(error), ...(retryAt && { retryAt }) });
  };

  const scheduleWeather = (delayMs: number) => {
    if (stopped || halted) return;

    weatherTimer = setTimeout(() => void refreshWeather(), delayMs);
  };

  const pushEntry = async (entry: OutboxEntry): Promise<SyncResult> => {
    const answer = await transport.push(entry);

    if (answer.ok) return settle(db, entry, answer.value).then(() => DONE);

    if (answer.error === "invalid") {
      fromScratch = true;

      return discard(db, entry).then(() => DONE);
    }

    if (!isHalt(answer.error)) await db.outbox.update(entry.seq, { attempts: entry.attempts + 1 });

    return answer;
  };

  const drain = async (): Promise<SyncResult> => {
    for (;;) {
      const entry = await db.outbox.orderBy("seq").first();

      if (entry === undefined) return DONE;

      const pushed = await pushEntry(entry);

      if (!pushed.ok) return pushed;
    }
  };

  const pull = async (): Promise<SyncResult> => {
    const cursor = fromScratch ? undefined : (await db.meta.get(CURSOR_KEY))?.value;

    const answer = await transport.pull(cursor as string | undefined);

    if (!answer.ok) return answer;

    await applyPull(db, answer.value);

    reportPhotos(livePhotoIds(answer.value.changes));

    fromScratch = false;

    syncFailures = 0;

    await record({ type: "synced", at: now().toISOString() });

    return DONE;
  };

  const sync = async (): Promise<SyncResult> => {
    if (halted) return err(halted);

    clearSyncTimer();

    const pushed = await drain();

    if (!pushed.ok && isHalt(pushed.error)) return fail(pushed.error).then(() => pushed);

    const pulled = await pull();

    const result = pulled.ok ? pushed : pulled;

    if (!result.ok) await fail(result.error);

    await refreshMovedWeather();

    return result;
  };

  const fetchWeather = async (place: WeatherLocation): Promise<SyncResult> => {
    fetchedPlace = placeKey(place);

    await record({ type: "weather-loading", at: now().toISOString() });

    const answer = await transport.weather();

    if (answer.ok) {
      await db.weather.put({ ...answer.value, accountId });

      weatherFailures = 0;

      await record({ type: "weather-loaded" });

      scheduleWeather(WEATHER_REFRESH_MS);

      return DONE;
    }

    if (isHalt(answer.error)) return fail(answer.error).then(() => answer);

    weatherFailures += 1;

    const delayMs = retryDelayMs(weatherFailures);

    await record({
      type: "weather-failed",
      retryAt: new Date(now().getTime() + delayMs).toISOString(),
    });

    scheduleWeather(delayMs);

    return answer;
  };

  const refreshWeather = () =>
    weatherQueue(async (): Promise<SyncResult> => {
      if (halted) return err(halted);

      clearWeatherTimer();

      const place = await readLocation(db, accountId);

      if (!place) return DONE;

      return fetchWeather(place);
    });

  const refreshMovedWeather = async () => {
    const place = await serverPlace(db, accountId);

    if (place !== undefined && place !== fetchedPlace) await refreshWeather();
  };

  const nudge = () => syncQueue(sync);

  return {
    start: async () => {
      await nudge();

      reportPhotos(await savedPhotoIds(db));

      if (weatherTimer === undefined) await refreshWeather();
    },
    nudge,
    resync: () => {
      fromScratch = true;

      return nudge();
    },
    refreshWeather,
    retrying: () => syncTimer !== undefined,
    stop: () => {
      stopped = true;

      clearWeatherTimer();

      clearSyncTimer();
    },
  };
}
