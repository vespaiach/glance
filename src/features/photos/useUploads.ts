"use client";

import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import { usePhotosRepo } from "@/data/repos";
import { uuidv7 } from "@/domain/id";
import { dateKey } from "@/domain/zone";
import { useNowStore } from "@/shell/providers/now";
import { useTimeZone } from "@/shell/providers/timeZone";
import { canRetry, chosenTile, type UploadTile, uploadFailure, uploads } from "./uploads";

type Chosen = { file: File; preview: string };

export type Uploads = {
  tiles: UploadTile[];
  choose(files: readonly File[]): void;
  retry(id: string): void;
  retryAll(): void;
  remove(id: string): void;
  clear(): void;
};

export function useUploads(initial: () => UploadTile[], online: boolean): Uploads {
  const repo = usePhotosRepo();

  const clock = useNowStore();

  const tz = useTimeZone();

  const chosen = useRef(new Map<string, Chosen>());

  const sending = useRef(new Set<string>());

  const connected = useRef(online);

  const [tiles, dispatch] = useReducer(uploads, undefined, initial);

  const forget = (id: string) => {
    const entry = chosen.current.get(id);

    if (entry) URL.revokeObjectURL(entry.preview);

    chosen.current.delete(id);
  };

  const send = async (id: string, file: File) => {
    sending.current.add(id);

    const modifiedOn = dateKey(new Date(file.lastModified), tz);

    const answer = await repo.upload(file, modifiedOn, (percent) =>
      dispatch({ type: "progress", id, percent }),
    );

    sending.current.delete(id);

    if (!answer.ok && !connected.current) return dispatch({ type: "pause" });

    if (!answer.ok) return dispatch({ type: "fail", id, reason: uploadFailure(answer.error) });

    forget(id);

    dispatch({ type: "done", id });
  };

  const choose = (files: readonly File[]) => {
    const added = files.map((file) => {
      const id = uuidv7(clock.get());

      const preview = URL.createObjectURL(file);

      chosen.current.set(id, { file, preview });

      return chosenTile(id, file, preview);
    });

    dispatch({ type: "add", tiles: added });

    for (const tile of added) {
      const entry = chosen.current.get(tile.id);

      if (tile.state === "uploading" && entry) void send(tile.id, entry.file);
    }
  };

  const retry = (id: string) => {
    if (!tiles.some((tile) => tile.id === id && canRetry(tile))) return;

    dispatch({ type: "retry", id });

    const entry = chosen.current.get(id);

    if (entry) void send(id, entry.file);
  };

  const resume = (tile: UploadTile) => {
    const entry = chosen.current.get(tile.id);

    if (tile.state !== "paused" || entry === undefined) return;

    if (sending.current.has(tile.id)) return dispatch({ type: "resume", id: tile.id });

    dispatch({ type: "restart", id: tile.id });

    void send(tile.id, entry.file);
  };

  const reconnect = useEffectEvent(() => {
    for (const tile of tiles) resume(tile);
  });

  useEffect(() => {
    connected.current = online;

    if (online) reconnect();
    else dispatch({ type: "pause" });
  }, [online]);

  const remove = (id: string) => {
    forget(id);

    dispatch({ type: "remove", id });
  };

  const retryAll = () => {
    for (const tile of tiles.filter(canRetry)) retry(tile.id);
  };

  const clear = () => {
    for (const tile of tiles) if (tile.state === "failed") forget(tile.id);

    dispatch({ type: "clear" });
  };

  return { tiles, choose, retry, retryAll, remove, clear };
}
