import { useEffect, useMemo, useState } from "react";
import type { LastImport } from "@/domain/imports";
import type { Transport } from "../sync/transport";
import { useRepoStore } from "./store";

export type ImportsRepo = Pick<Transport["imports"], "upload" | "commit" | "undo">;

export function useImportsRepo(): ImportsRepo {
  const { imports, nudge } = useRepoStore();

  return useMemo(
    () => ({
      upload: imports.upload,
      commit: (id, who) => thenNudge(imports.commit(id, who), nudge),
      undo: (id) => thenNudge(imports.undo(id), nudge),
    }),
    [imports, nudge],
  );
}

export function useLastImport(): LastImport | undefined {
  const { imports } = useRepoStore();

  const [last, setLast] = useState<LastImport>();

  useEffect(() => {
    let live = true;

    void imports.last().then((answer) => {
      if (live && answer.ok) setLast(answer.value);
    });

    return () => {
      live = false;
    };
  }, [imports]);

  return last;
}

async function thenNudge<T extends { ok: boolean }>(
  request: Promise<T>,
  nudge: () => unknown,
): Promise<T> {
  const answer = await request;

  if (answer.ok) nudge();

  return answer;
}
