"use client";

import * as stylex from "@stylexjs/stylex";
import { ArrowRight, Undo2, X } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Tag } from "@/domain/schemas";
import { Button } from "@/ui/Button";
import { Page } from "@/ui/Page";
import { PageTopBar } from "@/ui/PageTopBar";
import { type ImportPageAction, type OpenImportPage, whoName } from "../importPage";
import { DoneStep } from "./DoneStep";
import { ErrorStep } from "./ErrorStep";
import { type PhoneCode, PhoneStep } from "./PhoneStep";
import { ReviewStep } from "./ReviewStep";
import { type LastImport, SourceStep } from "./SourceStep";

export type ImportPageProps = {
  breakpoint: Breakpoint;
  state: OpenImportPage;
  leaving: boolean;
  tags: readonly Tag[];
  last?: LastImport;
  phone?: PhoneCode;
  dispatch: (action: ImportPageAction) => void;
  onFile: (file: File) => void;
  onImport: () => void;
  onUndo: () => void;
  onUndoLast: () => void;
  onOpenCalendar: () => void;
  onNewCode: () => void;
  onLeft: () => void;
};

const words = copy.import;

const styles = stylex.create({
  body: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    paddingBlock: "clamp(16px, 2.4vw, 32px)",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
});

export function ImportPage(props: ImportPageProps) {
  const { breakpoint, state, leaving, dispatch, onLeft } = props;

  const body = useRef<HTMLDivElement>(null);

  const back = () => dispatch({ type: "back" });

  useScrollTopOn(body, stepKey(state));

  return (
    <Page
      label={title(state)}
      breakpoint={breakpoint}
      onEscape={back}
      leaving={leaving}
      onLeft={onLeft}
      topBar={
        <PageTopBar
          backLabel={backLabel(state)}
          backIcon={state.step === "done" ? X : undefined}
          backDisabled={state.step === "importing"}
          onBack={back}
          title={title(state)}
        >
          <TopActions {...props} />
        </PageTopBar>
      }
    >
      <div ref={body} {...stylex.props(styles.body)}>
        <Step {...props} />
      </div>
    </Page>
  );
}

function Step(props: ImportPageProps) {
  const { breakpoint, state, tags, dispatch } = props;

  switch (state.step) {
    case "source":
      return (
        <SourceStep
          breakpoint={breakpoint}
          last={props.last}
          tags={tags}
          dispatch={dispatch}
          onFile={props.onFile}
          onUndoLast={props.onUndoLast}
        />
      );
    case "phone":
      return <PhoneStep breakpoint={breakpoint} code={props.phone} onNewCode={props.onNewCode} />;
    case "review":
    case "importing":
      return (
        <ReviewStep
          breakpoint={breakpoint}
          review={state.review}
          who={state.who}
          busy={state.step === "importing"}
          tags={tags}
          dispatch={dispatch}
        />
      );
    case "done":
      return <DoneStep done={state.done} who={whoName(state.done.who, tags)} />;
    case "error":
      return <ErrorStep error={state.error} dispatch={dispatch} />;
  }
}

function TopActions({ state, onImport, onUndo, onOpenCalendar }: ImportPageProps) {
  if (state.step === "review" || state.step === "importing") {
    const busy = state.step === "importing";

    return (
      <Button disabled={busy} onClick={onImport}>
        {busy ? words.review.running : words.review.run(state.review.newCount)}
      </Button>
    );
  }

  if (state.step !== "done") return null;

  return (
    <div {...stylex.props(styles.actions)}>
      <Button variant="ghost" icon={Undo2} onClick={onUndo}>
        {words.done.undo}
      </Button>
      <Button size="lg" iconRight={ArrowRight} onClick={onOpenCalendar}>
        {words.done.openCalendar}
      </Button>
    </div>
  );
}

function useScrollTopOn(body: RefObject<HTMLElement | null>, key: string) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: each new step scrolls to the top
  useEffect(() => {
    body.current?.closest('[role="dialog"]')?.scrollTo?.(0, 0);

    window.scrollTo?.(0, 0);
  }, [body, key]);
}

function stepKey(state: OpenImportPage): string {
  return state.step === "error" ? `error-${state.error}` : state.step;
}

function title(state: OpenImportPage): string {
  switch (state.step) {
    case "source":
      return words.source.title;
    case "phone":
      return words.phone.title;
    case "done":
      return words.done.title;
    default:
      return words.review.title;
  }
}

function backLabel(state: OpenImportPage): string {
  if (state.step === "source") return words.backToSettings;

  return state.step === "done" ? words.close : words.back;
}
