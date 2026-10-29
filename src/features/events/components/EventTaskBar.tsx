import * as stylex from "@stylexjs/stylex";
import { Check, Pencil, Trash2 } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { StatusTitle } from "@/domain/eventStatus";
import { formatLength } from "@/domain/time";
import { Button } from "@/ui/Button";
import { PageTopBar } from "@/ui/PageTopBar";
import type { Asking, EventPageMode } from "../eventPage";

type EventTaskBarProps = {
  breakpoint: Breakpoint;
  mode: EventPageMode;
  status?: StatusTitle;
  asking: Asking;
  canSave: boolean;
  online: boolean;
  onSave: () => void;
  onClose: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onKeep: () => void;
  onDelete: () => void;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

const words = copy.events.page;

const discard = copy.discard;

const styles = stylex.create({
  ask: {
    flexGrow: 1,
    fontWeight: 540,
    whiteSpace: "nowrap",
  },
});

const askSizes = stylex.create({
  large: { fontSize: 24 },
  normal: { fontSize: 20 },
  small: { fontSize: 18 },
});

export function EventTaskBar(props: EventTaskBarProps) {
  const { breakpoint, mode, status, asking, onClose } = props;

  const asksDiscard = asking === "discard";

  const showsTitle = !(asksDiscard && breakpoint === "small");

  return (
    <PageTopBar
      backLabel={words.back}
      onBack={asksDiscard ? undefined : onClose}
      title={showsTitle && taskBarTitle(mode, status)}
    >
      {asksDiscard ? <DiscardAsk {...props} /> : <Actions {...props} />}
    </PageTopBar>
  );
}

export function taskBarTitle(mode: EventPageMode, status: StatusTitle | undefined): string {
  if (mode === "new") return words.newTitle;

  if (mode === "edit" || !status) return words.editTitle;

  return words.status(status, formatLength);
}

function DiscardAsk({ breakpoint, onKeepEditing, onDiscard }: EventTaskBarProps) {
  return (
    <>
      <span {...stylex.props(styles.ask, askSizes[breakpoint])}>{discard.title}</span>
      <Button variant="secondary" onClick={onKeepEditing}>
        {discard.keepEditing}
      </Button>
      <Button variant="danger" onClick={onDiscard}>
        {discard.discard}
      </Button>
    </>
  );
}

function Actions(props: EventTaskBarProps) {
  const { mode, status, canSave, onSave, onEdit } = props;

  if (mode === "view") {
    if (status?.kind === "ended") return null;

    return (
      <Button variant="secondary" icon={Pencil} onClick={onEdit}>
        {words.editAction}
      </Button>
    );
  }

  return (
    <>
      {mode === "edit" && <DeleteActions {...props} />}
      <Button icon={Check} size="lg" disabled={!canSave} onClick={onSave}>
        {saveLabel(props)}
      </Button>
    </>
  );
}

function DeleteActions({ asking, onAskDelete, onKeep, onDelete }: EventTaskBarProps) {
  if (asking !== "delete") {
    return (
      <Button variant="ghost" icon={Trash2} onClick={onAskDelete}>
        {words.delete}
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" onClick={onKeep}>
        {words.keep}
      </Button>
      <Button variant="danger" icon={Trash2} onClick={onDelete}>
        {words.deleteEvent}
      </Button>
    </>
  );
}

function saveLabel({ breakpoint, mode, online }: EventTaskBarProps): string {
  if (!online) return words.saveOffline;

  return mode === "new" && breakpoint !== "small" ? words.saveNew : words.save;
}
