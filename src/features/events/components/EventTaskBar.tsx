import * as stylex from "@stylexjs/stylex";
import { Check, type LucideIcon, Pencil, Trash2, X } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { StatusTitle } from "@/domain/eventStatus";
import { formatLength } from "@/domain/time";
import { colors } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { IconButton } from "@/ui/IconButton";
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

type ActionProps = {
  breakpoint: Breakpoint;
  variant: "primary" | "secondary" | "ghost" | "danger";
  icon?: LucideIcon;
  smallIcon?: LucideIcon;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

const words = copy.events.page;

const discard = copy.discard;

const styles = stylex.create({
  ask: {
    flexGrow: 1,
    fontWeight: 540,
    whiteSpace: "nowrap",
  },
  dangerIcon: {
    backgroundColor: colors.danger,
    color: colors.textInverse,
  },
  dimmed: {
    opacity: 0.35,
  },
});

const ICON_VARIANTS = {
  primary: "solid",
  secondary: "canvas",
  ghost: "canvas",
  danger: "solid",
} as const;

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
      compact={breakpoint === "small"}
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
  const buttonSize = breakpoint === "small" ? "md" : "lg";

  return (
    <>
      <span {...stylex.props(styles.ask, askSizes[breakpoint])}>{discard.title}</span>
      <Button variant="secondary" size={buttonSize} onClick={onKeepEditing}>
        {discard.keepEditing}
      </Button>
      <Button variant="danger" size={buttonSize} onClick={onDiscard}>
        {discard.discard}
      </Button>
    </>
  );
}

function Actions(props: EventTaskBarProps) {
  const { breakpoint, mode, status, canSave, onSave, onEdit } = props;

  if (mode === "view") {
    if (status?.kind === "ended") return null;

    return (
      <Action
        breakpoint={breakpoint}
        variant="secondary"
        icon={Pencil}
        label={words.editAction}
        onClick={onEdit}
      />
    );
  }

  return (
    <>
      {mode === "edit" && <DeleteActions {...props} />}
      <Action
        breakpoint={breakpoint}
        variant="primary"
        icon={Check}
        label={saveLabel(props)}
        disabled={!canSave}
        onClick={onSave}
      />
    </>
  );
}

function DeleteActions({ breakpoint, asking, onAskDelete, onKeep, onDelete }: EventTaskBarProps) {
  if (asking !== "delete") {
    return (
      <Action
        breakpoint={breakpoint}
        variant="ghost"
        icon={Trash2}
        label={words.delete}
        onClick={onAskDelete}
      />
    );
  }

  return (
    <>
      <Action
        breakpoint={breakpoint}
        variant="ghost"
        smallIcon={X}
        label={words.keep}
        onClick={onKeep}
      />
      <Action
        breakpoint={breakpoint}
        variant="danger"
        icon={Trash2}
        label={words.deleteEvent}
        onClick={onDelete}
      />
    </>
  );
}

function Action({
  breakpoint,
  variant,
  icon,
  smallIcon = icon,
  label,
  disabled,
  onClick,
}: ActionProps) {
  if (breakpoint === "small" && smallIcon) {
    return (
      <IconButton
        icon={smallIcon}
        label={label}
        variant={ICON_VARIANTS[variant]}
        disabled={disabled}
        onClick={onClick}
        xstyle={[variant === "danger" && styles.dangerIcon, disabled && styles.dimmed]}
      />
    );
  }

  return (
    <Button variant={variant} icon={icon} size="lg" disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}

function saveLabel({ breakpoint, mode, online }: EventTaskBarProps): string {
  if (!online) return words.saveOffline;

  return mode === "new" && breakpoint !== "small" ? words.saveNew : words.save;
}
