"use client";

import { useReducer, useRef } from "react";
import { usePhotosRepo } from "@/data/repos";
import { uuidv7 } from "@/domain/id";
import { useNowStore } from "@/shell/providers/now";
import { chosenTile, type UploadTile, uploadFailure, uploads } from "./uploads";

type Chosen = { file: File; preview: string };

export type Uploads = {
  tiles: UploadTile[];
  choose(files: readonly File[]): void;
  retry(id: string): void;
  remove(id: string): void;
};

function canRetry(tile: UploadTile): boolean {
  return tile.state === "failed" && tile.reason === "network";
}

export function useUploads(initial: () => UploadTile[]): Uploads {
  const repo = usePhotosRepo();

  const clock = useNowStore();

  const chosen = useRef(new Map<string, Chosen>());

  const [tiles, dispatch] = useReducer(uploads, undefined, initial);

  const forget = (id: string) => {
    const entry = chosen.current.get(id);

    if (entry) URL.revokeObjectURL(entry.preview);

    chosen.current.delete(id);
  };

  const send = async (id: string, file: File) => {
    const answer = await repo.upload(file, (percent) =>
      dispatch({ type: "progress", id, percent }),
    );

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

  const remove = (id: string) => {
    forget(id);

    dispatch({ type: "remove", id });
  };

  return { tiles, choose, retry, remove };
}
