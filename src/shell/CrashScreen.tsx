"use client";

import * as stylex from "@stylexjs/stylex";
import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { copy } from "@/copy";
import type { ReportError, ReportExtra } from "@/data/repos";
import { recentCrashes } from "@/domain/recovery";
import { colors, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { reportPageError } from "./ErrorReporter";
import { NowProvider, useNow } from "./providers/now";

type CrashScreenProps = {
  error: unknown;
  report?: ReportError;
  reload?: () => void;
};

const RELOAD_S = 60;

const CRASH_LIMIT = 3;

const CRASHES_KEY = "glance-crashes";

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
    backgroundColor: colors.surfaceCanvas,
  },
  title: {
    margin: 0,
    font: "inherit",
  },
});

export function CrashScreen({
  error,
  report = reportPageError,
  reload = reloadPage,
}: CrashScreenProps) {
  useEffect(() => report("page-crashed", error, digestOf(error)), [report, error]);

  return (
    <NowProvider>
      <main {...stylex.props(styles.root)}>
        <Countdown reload={reload} />
      </main>
    </NowProvider>
  );
}

function Countdown({ reload }: { reload: () => void }) {
  const now = useNow("second");

  const [shownAt] = useState(now);

  const [looping] = useState(() => recentCrashes(savedCrashes(), now).length >= CRASH_LIMIT - 1);

  const reloadCounting = () => {
    saveCrash(shownAt);

    reload();
  };

  const left = Math.max(0, RELOAD_S - Math.floor((now.getTime() - shownAt.getTime()) / 1000));

  useEffect(() => {
    if (left > 0 || looping) return;

    saveCrash(shownAt);

    reload();
  }, [left, looping, shownAt, reload]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title={<h1 {...stylex.props(styles.title)}>{copy.crash.title}</h1>}
      body={looping ? copy.crash.stuck : copy.crash.body(left)}
      size="lg"
      align="center"
      action={
        <Button variant="secondary" icon={RotateCw} onClick={reloadCounting}>
          {copy.crash.reload}
        </Button>
      }
    />
  );
}

function digestOf(error: unknown): ReportExtra {
  if (typeof error !== "object" || error === null || !("digest" in error)) return {};

  return typeof error.digest === "string" ? { digest: error.digest } : {};
}

function savedCrashes(): string[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(CRASHES_KEY) ?? "[]");

    return Array.isArray(saved) ? saved.filter((at) => typeof at === "string") : [];
  } catch {
    return [];
  }
}

function saveCrash(at: Date) {
  const crashes = [...recentCrashes(savedCrashes(), at), at.toISOString()];

  try {
    sessionStorage.setItem(CRASHES_KEY, JSON.stringify(crashes));
  } catch {
    return;
  }
}

function reloadPage() {
  location.reload();
}
