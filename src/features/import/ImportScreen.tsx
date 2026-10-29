"use client";

import { useRouter } from "next/navigation";
import { useReducer, useState } from "react";
import { type ImportsRepo, useImportsRepo, useLastImport, useTags } from "@/data/repos";
import type { Tag } from "@/domain/schemas";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { ImportPage } from "./components/ImportPage";
import {
  type ImportPageAction,
  type ImportPageState,
  importPageReducer,
  initialImportPage,
  type OpenImportPage,
} from "./importPage";
import { lastShown, rangeShown, reviewShown } from "./importReview";

type Dispatch = (action: ImportPageAction) => void;

const SETTINGS_PATH = "/settings";

const CALENDAR_PATH = "/calendar";

export function ImportScreen() {
  const tags = useTags();

  return tags ? <ImportFrame tags={tags} /> : null;
}

function ImportFrame({ tags }: { tags: readonly Tag[] }) {
  const router = useRouter();

  const repo = useImportsRepo();

  const tz = useTimeZone();

  const now = useNow("minute");

  const { clock } = useAccountSettings();

  const { online } = useNetwork();

  const [state, dispatch] = useReducer(importPageReducer, undefined, initialImportPage);

  const shown = useLastOpen(state);

  const [stagedId, setStagedId] = useState<string>();

  const [exitTo, setExitTo] = useState(SETTINGS_PATH);

  const last = useLastImport();

  const [undoneId, setUndoneId] = useState<string>();

  const onFile = async (file: File) => {
    const answer = await repo.upload(file);

    if (answer.ok) {
      setStagedId(answer.value.id);

      dispatch({ type: "reviewed", review: reviewShown(answer.value, tz, clock) });
    } else if (answer.error === "no-upcoming") dispatch({ type: "failed", error: "empty" });
    else if (isFileProblem(answer.error)) dispatch({ type: "failed", error: "type" });
  };

  const onImport = () => {
    if (state.step !== "review" || stagedId === undefined) return;

    dispatch({ type: "importing" });

    if (!online) return dispatch({ type: "offline" });

    void commit(repo, stagedId, state.who, tz, dispatch);
  };

  const leave = (path: string) => {
    setExitTo(path);

    dispatch({ type: "back" });
  };

  const onUndo = () => {
    if (stagedId !== undefined) void repo.undo(stagedId);

    leave(SETTINGS_PATH);
  };

  const onUndoLast = async () => {
    if (!last) return;

    const answer = await repo.undo(last.id);

    if (answer.ok) setUndoneId(last.id);
  };

  const breakpoint = useBreakpoint();

  const shownLast = last && last.id !== undoneId ? lastShown(last, now, tz) : undefined;

  return (
    <ImportPage
      breakpoint={breakpoint}
      state={shown}
      leaving={state.step === "closed"}
      tags={tags}
      last={shownLast && { ...shownLast, canUndo: shownLast.canUndo && online }}
      dispatch={dispatch}
      onFile={(file) => void onFile(file)}
      onImport={onImport}
      onUndo={onUndo}
      onUndoLast={() => void onUndoLast()}
      onOpenCalendar={() => leave(CALENDAR_PATH)}
      onNewCode={() => {}}
      onLeft={() => router.push(exitTo)}
    />
  );
}

async function commit(
  repo: ImportsRepo,
  id: string,
  who: string,
  tz: string,
  dispatch: Dispatch,
): Promise<void> {
  const answer = await repo.commit(id, who);

  if (!answer.ok) return dispatch({ type: "offline" });

  dispatch({
    type: "imported",
    count: answer.value.count,
    range: rangeShown(answer.value.range, tz),
  });
}

function useLastOpen(state: ImportPageState): OpenImportPage {
  const [shown, setShown] = useState(state as OpenImportPage);

  if (state.step !== "closed" && state !== shown) setShown(state);

  return state.step === "closed" ? shown : state;
}

function isFileProblem(error: string): boolean {
  return error === "not-ics" || error === "too-large" || error === "invalid";
}
