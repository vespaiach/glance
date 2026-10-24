import * as stylex from "@stylexjs/stylex";
import {
  CalendarDays,
  Check,
  Image,
  type LucideIcon,
  MonitorSmartphone,
  StickyNote,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useId } from "react";
import { copy } from "@/copy";
import type { AccountCounts } from "@/data/repos";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import type { DeleteAccountDialog as DeleteAccountState } from "../deleteAccountDialog";

type DeleteAccountDialogProps = {
  email: string;
  counts: AccountCounts | undefined;
  screens: number;
  state: Exclude<DeleteAccountState, { kind: "closed" }>;
  onToggle: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

type ErasedItem = { icon: LucideIcon; label: string; count: number | undefined };

const text = copy.settings.account.deleteDialog;

const styles = stylex.create({
  disc: {
    display: "grid",
    placeItems: "center",
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: colors.danger,
    color: colors.textInverse,
  },
  message: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
  },
  body: {
    margin: 0,
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    paddingBlock: 0,
    paddingInline: 16,
    listStyle: "none",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minHeight: 52,
  },
  divided: {
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  itemIcon: {
    display: "flex",
    flexShrink: 0,
  },
  itemLabel: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: 330,
  },
  count: {
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontFamily: "inherit",
    color: colors.textPrimary,
    textAlign: "left",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transform: { default: null, ":active": `scale(${motion.pressScaleRow})` },
  },
  box: {
    display: "grid",
    placeItems: "center",
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1.5px ${colors.actionPrimary}`,
    color: colors.onActionPrimary,
  },
  boxChecked: {
    backgroundColor: colors.actionPrimary,
    boxShadow: "none",
  },
  rowText: {
    fontSize: 17,
    fontWeight: 340,
    lineHeight: 1.35,
    textWrap: "pretty",
  },
  status: {
    display: "flex",
    alignItems: "center",
    minHeight: 56,
  },
  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
});

export function DeleteAccountDialog({
  email,
  counts,
  screens,
  state,
  onToggle,
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const titleId = useId();

  const busy = state.kind === "deleting";

  const checked = state.kind !== "ask";

  return (
    <Dialog labelledBy={titleId} alert busy={busy} onClose={onCancel}>
      <span {...stylex.props(styles.disc)}>
        <Icon icon={Trash2} size={28} strokeWidth={1.5} />
      </span>
      <div {...stylex.props(styles.message)}>
        <Eyebrow>{email}</Eyebrow>
        <h2 id={titleId} {...stylex.props(styles.title)}>
          {text.title}
        </h2>
        <p {...stylex.props(styles.body)}>{text.body}</p>
      </div>
      <ul aria-label={text.erased} {...stylex.props(styles.list)}>
        {erasedItems(counts, screens).map((item, index) => (
          <li key={item.label} {...stylex.props(styles.item, index > 0 && styles.divided)}>
            <span {...stylex.props(styles.itemIcon)}>
              <Icon icon={item.icon} size={20} />
            </span>
            <span {...stylex.props(styles.itemLabel)}>{item.label}</span>
            <Eyebrow size="caption" xstyle={styles.count}>
              {item.count === undefined ? text.loading : String(item.count)}
            </Eyebrow>
          </li>
        ))}
      </ul>
      {busy ? (
        <div role="status" {...stylex.props(styles.status, styles.rowText)}>
          {text.erasing}
        </div>
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: a styled button keeps the 56 px row, the 28 px box and the press scale; role and state follow the ARIA checkbox
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={onToggle}
          {...stylex.props(styles.checkRow)}
        >
          <span {...stylex.props(styles.box, checked && styles.boxChecked)}>
            {checked && <Icon icon={Check} size={18} strokeWidth={2.5} />}
          </span>
          <span {...stylex.props(styles.rowText)}>{text.understand}</span>
        </button>
      )}
      {state.kind === "failed" && (
        <div role="alert">
          <Banner
            tone="soft"
            icon={TriangleAlert}
            title={text.failedTitle}
            body={text.failedBody}
            actionLabel={text.retry}
            onAction={onConfirm}
          />
        </div>
      )}
      <div {...stylex.props(styles.buttons)}>
        <Button
          variant="danger"
          icon={Trash2}
          fullWidth
          disabled={!checked || busy}
          onClick={onConfirm}
        >
          {busy ? text.deleting : text.confirm}
        </Button>
        <Button variant="ghost" fullWidth disabled={busy} onClick={onCancel}>
          {text.keep}
        </Button>
      </div>
    </Dialog>
  );
}

function erasedItems(counts: AccountCounts | undefined, screens: number): ErasedItem[] {
  return [
    { icon: CalendarDays, label: text.events, count: counts?.events },
    { icon: StickyNote, label: text.notes, count: counts?.notes },
    { icon: Image, label: text.photos, count: counts?.photos },
    { icon: Users, label: text.tags, count: counts?.tags },
    { icon: MonitorSmartphone, label: text.screens, count: screens },
  ];
}
