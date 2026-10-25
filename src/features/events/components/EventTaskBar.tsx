import * as stylex from "@stylexjs/stylex";
import { Check, Clock, Pencil, Trash2, X } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { StatusTitle } from "@/domain/eventStatus";
import { formatLength } from "@/domain/time";
import { colors } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
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

const ICON_SIZE: Record<Breakpoint, number> = { large: 32, normal: 28, small: 22 };

const styles = stylex.create({
  bar: {
    flexShrink: 0,
    minWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px 16px",
    color: colors.textPrimary,
  },
  title: {
    minWidth: 0,
    marginRight: "auto",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontWeight: 540,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
    whiteSpace: "nowrap",
  },
  ask: {
    flexGrow: 1,
    fontWeight: 540,
    whiteSpace: "nowrap",
  },
});

const barSizes = stylex.create({
  large: { minHeight: 72 },
  normal: { minHeight: 56 },
  small: { minHeight: 56 },
});

const titleSizes = stylex.create({
  large: { fontSize: 32 },
  normal: { fontSize: 28 },
  small: { fontSize: 22 },
});

const askSizes = stylex.create({
  large: { fontSize: 24 },
  normal: { fontSize: 20 },
  small: { fontSize: 18 },
});

export function EventTaskBar(props: EventTaskBarProps) {
  const { breakpoint, mode, status, asking, onClose } = props;

  const asksDiscard = asking === "discard";

  return (
    <div {...stylex.props(styles.bar, barSizes[breakpoint])}>
      {!(asksDiscard && breakpoint === "small") && (
        <span {...stylex.props(styles.title, titleSizes[breakpoint])}>
          {mode === "view" && <Icon icon={Clock} size={ICON_SIZE[breakpoint]} />}
          {titleText(mode, status)}
        </span>
      )}
      {asksDiscard ? <DiscardAsk {...props} /> : <Actions {...props} />}
      {!asksDiscard && (
        <IconButton icon={X} label={words.close} variant="canvas" size="touch" onClick={onClose} />
      )}
    </div>
  );
}

function DiscardAsk({ breakpoint, onKeepEditing, onDiscard }: EventTaskBarProps) {
  const size = buttonSize(breakpoint);

  return (
    <>
      <span {...stylex.props(styles.ask, askSizes[breakpoint])}>{discard.title}</span>
      <Button variant="secondary" size={size} onClick={onKeepEditing}>
        {discard.keepEditing}
      </Button>
      <Button variant="danger" size={size} onClick={onDiscard}>
        {discard.discard}
      </Button>
    </>
  );
}

function Actions(props: EventTaskBarProps) {
  const { breakpoint, mode, status, canSave, onSave, onEdit } = props;

  const size = buttonSize(breakpoint);

  if (mode === "view") {
    if (status?.kind === "ended") return null;

    return (
      <Button variant="secondary" size={size} icon={Pencil} onClick={onEdit}>
        {words.editAction}
      </Button>
    );
  }

  return (
    <>
      {mode === "edit" && <DeleteActions {...props} />}
      <Button size={size} icon={Check} disabled={!canSave} onClick={onSave}>
        {saveLabel(props)}
      </Button>
    </>
  );
}

function DeleteActions({ breakpoint, asking, onAskDelete, onKeep, onDelete }: EventTaskBarProps) {
  const size = buttonSize(breakpoint);

  if (asking !== "delete") {
    return (
      <Button variant="ghost" size={size} icon={Trash2} onClick={onAskDelete}>
        {words.delete}
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size={size} onClick={onKeep}>
        {words.keep}
      </Button>
      <Button variant="danger" size={size} icon={Trash2} onClick={onDelete}>
        {words.deleteEvent}
      </Button>
    </>
  );
}

function titleText(mode: EventPageMode, status: StatusTitle | undefined): string {
  if (mode === "new") return words.newTitle;

  if (mode === "edit" || !status) return words.editTitle;

  return words.status(status, formatLength);
}

function saveLabel({ breakpoint, mode, online }: EventTaskBarProps): string {
  if (!online) return words.saveOffline;

  return mode === "new" && breakpoint !== "small" ? words.saveNew : words.save;
}

function buttonSize(breakpoint: Breakpoint) {
  return breakpoint === "large" ? "lg" : "md";
}
