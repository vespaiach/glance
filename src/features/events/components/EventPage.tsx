"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import type { Breakpoint } from "@/domain/breakpoint";
import type { StatusTitle } from "@/domain/eventStatus";
import type { Tag, TagColor } from "@/domain/schemas";
import type { Clock } from "@/domain/time";
import { Page } from "@/ui/Page";
import {
  asksSaveScope,
  canSave,
  type EventPageAction,
  type EventPageEditState,
  type OpenEventPage,
  type PageDraft,
  type SeriesScope,
} from "../eventPage";
import { EventPicker } from "./EventPicker";
import { EventSentence, type SameTime } from "./EventSentence";
import { EventTaskBar, taskBarTitle } from "./EventTaskBar";
import { SeriesDialog } from "./SeriesDialog";

type EventPageProps = {
  breakpoint: Breakpoint;
  state: OpenEventPage;
  leaving: boolean;
  tags: readonly Tag[];
  clock: Clock;
  today: string;
  online: boolean;
  status?: StatusTitle;
  sameTime?: SameTime;
  recentTitles: readonly string[];
  recentPlaces: readonly string[];
  preview?: ReactNode;
  facts?: ReactNode;
  keyboardInset?: number;
  dispatch: (action: EventPageAction) => void;
  onSave: (scope?: SeriesScope) => void;
  onDelete: (scope?: SeriesScope) => void;
  onLeft: () => void;
  onCreateTag: (name: string, color: TagColor) => string;
};

type BodyProps = EventPageProps & { state: EventPageEditState };

type ViewProps = EventPageProps & { draft: PageDraft };

const styles = stylex.create({
  body: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: "auto",
    display: "flex",
  },
  column: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
});

const gaps = stylex.create({
  large: { gap: 24 },
  normal: { gap: 16 },
  small: { gap: 12 },
});

export function EventPage(props: EventPageProps) {
  const { breakpoint, state, leaving, status, online, keyboardInset, dispatch, onLeft } = props;

  const close = () => dispatch({ type: "close" });

  const draft = state.mode === "view" ? state.opened : state.draft;

  const save = () =>
    state.mode !== "view" && asksSaveScope(state) ? dispatch({ type: "askSave" }) : props.onSave();

  return (
    <>
      <Page
        label={taskBarTitle(state.mode, status)}
        breakpoint={breakpoint}
        onEscape={close}
        leaving={leaving}
        onLeft={onLeft}
        keyboardInset={keyboardInset}
        topBar={
          <EventTaskBar
            breakpoint={breakpoint}
            mode={state.mode}
            status={status}
            asking={state.mode === "view" ? "none" : state.asking}
            canSave={canSave(draft)}
            online={online}
            onSave={save}
            onClose={close}
            onEdit={() => dispatch({ type: "edit", word: "title", ended: isEnded(status) })}
            onAskDelete={() => dispatch({ type: "askDelete" })}
            onKeep={() => dispatch({ type: "keep" })}
            onDelete={() => props.onDelete()}
            onKeepEditing={() => dispatch({ type: "keepEditing" })}
            onDiscard={() => dispatch({ type: "discard" })}
          />
        }
      >
        {state.mode === "view" ? (
          <ViewBody {...props} draft={state.opened} />
        ) : (
          <EditBody {...props} state={state} />
        )}
      </Page>
      {state.mode !== "view" && <ScopeDialog {...props} state={state} />}
    </>
  );
}

function ScopeDialog({ state, dispatch, onSave, onDelete }: BodyProps) {
  if (state.asking !== "deleteScope" && state.asking !== "saveScope") return null;

  const deleting = state.asking === "deleteScope";

  const run = (scope: SeriesScope) => (deleting ? onDelete(scope) : onSave(scope));

  return (
    <SeriesDialog
      kind={deleting ? "delete" : "save"}
      title={state.opened.title}
      day={state.opened.day}
      onOne={() => run("one")}
      onAll={() => run("all")}
      onCancel={() => dispatch({ type: deleting ? "keep" : "keepEditing" })}
    />
  );
}

function ViewBody({ breakpoint, draft, tags, clock, status, facts, dispatch }: ViewProps) {
  const ended = isEnded(status);

  return (
    <div {...stylex.props(styles.body, styles.column, gaps[breakpoint])}>
      <EventSentence
        breakpoint={breakpoint}
        mode="view"
        draft={draft}
        tags={tags}
        touched={[]}
        word={null}
        clock={clock}
        locked={ended}
        onSelect={(word) => dispatch({ type: "edit", word, ended })}
        onAddEnd={() => {}}
        onNotify={() => {}}
      />
      {facts}
    </div>
  );
}

function EditBody(props: BodyProps) {
  const { breakpoint, state, tags, clock, sameTime, preview, dispatch } = props;

  return (
    <div {...stylex.props(styles.body, gaps[breakpoint])}>
      <div {...stylex.props(styles.column, gaps[breakpoint])}>
        <EventSentence
          breakpoint={breakpoint}
          mode="edit"
          draft={state.draft}
          tags={tags}
          touched={state.touched}
          word={state.word}
          clock={clock}
          sameTime={sameTime}
          onSelect={(word) => dispatch({ type: "select", word })}
          onAddEnd={() => dispatch({ type: "addEnd" })}
          onNotify={(value) => dispatch({ type: "notify", value })}
        />
        <EventPicker
          breakpoint={breakpoint}
          word={state.word}
          draft={state.draft}
          today={props.today}
          clock={clock}
          tags={tags}
          recentTitles={props.recentTitles}
          recentPlaces={props.recentPlaces}
          onAction={dispatch}
          onCreateTag={props.onCreateTag}
        />
      </div>
      {breakpoint === "large" && preview}
    </div>
  );
}

function isEnded(status: StatusTitle | undefined): boolean {
  return status?.kind === "ended";
}
