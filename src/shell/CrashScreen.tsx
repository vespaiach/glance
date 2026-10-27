"use client";

import * as stylex from "@stylexjs/stylex";
import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { copy } from "@/copy";
import type { ReportError } from "@/data/repos";
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
  useEffect(() => report("page-crashed", error), [report, error]);

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

  const left = Math.max(0, RELOAD_S - Math.floor((now.getTime() - shownAt.getTime()) / 1000));

  useEffect(() => {
    if (left === 0) reload();
  }, [left, reload]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title={<h1 {...stylex.props(styles.title)}>{copy.crash.title}</h1>}
      body={copy.crash.body(left)}
      size="lg"
      align="center"
      action={
        <Button variant="secondary" icon={RotateCw} onClick={reload}>
          {copy.crash.reload}
        </Button>
      }
    />
  );
}

function reloadPage() {
  location.reload();
}
