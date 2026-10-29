"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useReducer, useState } from "react";
import { type ImportsRepo, useImportsRepo, useLastImport, useTags } from "@/data/repos";
import type { ImportReview } from "@/domain/imports";
import type { Tag } from "@/domain/schemas";
import { useQrTile } from "@/features/settings";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { ImportPage } from "./components/ImportPage";
import type { PhoneCode } from "./components/PhoneStep";
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

const POLL_MS = 3000;

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

  const [forDisplay] = useState(forDisplayFrom);

  const waiting = state.step === "phone";

  const phone = usePhoneCode(waiting);

  const review = (staged: ImportReview) => {
    setStagedId(staged.id);

    dispatch({ type: "reviewed", review: reviewShown(staged, tz, clock) });
  };

  usePhoneFile(waiting, repo, stagedId, review);

  const onFile = async (file: File) => {
    const answer = await repo.upload(file, forDisplay);

    if (answer.ok) review(answer.value);
    else if (answer.error === "no-upcoming") dispatch({ type: "failed", error: "empty" });
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
      {...(phone.code && { phone: phone.code })}
      dispatch={dispatch}
      onFile={(file) => void onFile(file)}
      onImport={onImport}
      onUndo={onUndo}
      onUndoLast={() => void onUndoLast()}
      onOpenCalendar={() => leave(CALENDAR_PATH)}
      onNewCode={phone.renew}
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

function usePhoneCode(active: boolean): { code?: PhoneCode; renew: () => void } {
  const qr = useQrTile("import");

  const onActive = useEffectEvent(() => {
    qr.show();

    return qr.close;
  });

  useEffect(() => (active ? onActive() : undefined), [active]);

  const endsIn = minutesSeconds(qr.secondsLeft);

  if (qr.tile.kind === "open") return { code: { link: qr.tile.url, endsIn }, renew: qr.renew };

  return qr.tile.kind === "issuing" ? { code: { endsIn }, renew: qr.renew } : { renew: qr.renew };
}

function usePhoneFile(
  active: boolean,
  repo: ImportsRepo,
  ownId: string | undefined,
  onArrived: (staged: ImportReview) => void,
): void {
  const arrived = useEffectEvent(async () => {
    const answer = await repo.staged();

    return answer.ok && answer.value?.id !== ownId ? answer.value : undefined;
  });

  const onFile = useEffectEvent(onArrived);

  useEffect(() => {
    if (!active) return;

    let live = true;

    const timer = setInterval(async () => {
      const staged = await arrived();

      if (live && staged) onFile(staged);
    }, POLL_MS);

    return () => {
      live = false;

      clearInterval(timer);
    };
  }, [active]);
}

function useLastOpen(state: ImportPageState): OpenImportPage {
  const [shown, setShown] = useState(state as OpenImportPage);

  if (state.step !== "closed" && state !== shown) setShown(state);

  return state.step === "closed" ? shown : state;
}

function isFileProblem(error: string): boolean {
  return error === "not-ics" || error === "too-large" || error === "invalid";
}

function forDisplayFrom(): string | undefined {
  return new URLSearchParams(window.location.search).get("forDisplay") ?? undefined;
}

function minutesSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
