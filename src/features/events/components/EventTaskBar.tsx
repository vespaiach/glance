import * as stylex from "@stylexjs/stylex";
import { Check, Clock, Pencil, Trash2, X } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { StatusTitle } from "@/domain/eventStatus";
import { formatLength } from "@/domain/time";
import { colors, motion, shadows } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import type { Asking, EventPageMode } from "../eventPage";

type EventTaskBarProps = {
  breakpoint: Breakpoint;
  mode: EventPageMode;
  status?: StatusTitle;
  asking: Asking;
  scrolled?: boolean;
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
    position: "sticky",
    top: 0,
    zIndex: 20,
    flexShrink: 0,
    minWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px 16px",
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    boxShadow: shadows.shadow0,
    transitionProperty: "box-shadow",
    transitionDuration: motion.durFast,
    transitionTimingFunction: "ease-out",
  },
  scrolled: {
    boxShadow: shadows.shadow2,
  },
  save: {
    gap: 6,
    paddingBlock: 8,
    paddingInline: 16,
    fontSize: 16,
    minHeight: 40,
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
  large: { minHeight: 48, margin: "0 -48px -20px", padding: "8px 48px" },
  normal: { minHeight: 44, margin: "0 -24px -12px", padding: "6px 24px" },
  small: { minHeight: 40, margin: "2px -12px -10px", padding: "6px 12px" },
});

const titleSizes = stylex.create({
  large: { fontSize: 26 },
  normal: { fontSize: 24 },
  small: { fontSize: 20 },
});

const askSizes = stylex.create({
  large: { fontSize: 24 },
  normal: { fontSize: 20 },
  small: { fontSize: 18 },
});

export function EventTaskBar(props: EventTaskBarProps) {
  const { breakpoint, mode, status, asking, scrolled, onClose } = props;

  const asksDiscard = asking === "discard";

  return (
    <div {...stylex.props(styles.bar, barSizes[breakpoint], scrolled && styles.scrolled)}>
      {!(asksDiscard && breakpoint === "small") && (
        <span {...stylex.props(styles.title, titleSizes[breakpoint])}>
          {mode === "view" && <Icon icon={Clock} size={ICON_SIZE[breakpoint]} />}
          {taskBarTitle(mode, status)}
        </span>
      )}
      {asksDiscard ? <DiscardAsk {...props} /> : <Actions {...props} />}
      {!asksDiscard && (
        <IconButton icon={X} label={words.close} variant="canvas" onClick={onClose} />
      )}
    </div>
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
      <Button icon={Check} disabled={!canSave} onClick={onSave} xstyle={styles.save}>
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
