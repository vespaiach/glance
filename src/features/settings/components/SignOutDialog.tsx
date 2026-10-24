import * as stylex from "@stylexjs/stylex";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { useId } from "react";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";
import { radii, shadows } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import type { SignOutDialog as SignOutDialogState } from "../signOutDialog";

type SignOutDialogProps = {
  email: string;
  online: boolean;
  state: Exclude<SignOutDialogState, { kind: "closed" }>;
  onThisDevice: () => void;
  onAllDevices: () => void;
  onCancel: () => void;
};

const text = copy.settings.account.signOutDialog;

const styles = stylex.create({
  disc: {
    display: "grid",
    placeItems: "center",
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: season.block1,
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
  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  ring: {
    boxShadow: shadows.shadow1,
  },
  failed: {
    margin: 0,
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.4,
  },
});

export function SignOutDialog({
  email,
  online,
  state,
  onThisDevice,
  onAllDevices,
  onCancel,
}: SignOutDialogProps) {
  const titleId = useId();

  const busy = state.kind === "signing-out";

  return (
    <Dialog labelledBy={titleId} onClose={onCancel}>
      <span {...stylex.props(styles.disc)}>
        <Icon icon={LogOut} size={28} strokeWidth={1.5} />
      </span>
      <div {...stylex.props(styles.message)}>
        <Eyebrow>{email}</Eyebrow>
        <h2 id={titleId} {...stylex.props(styles.title)}>
          {text.title}
        </h2>
        <p {...stylex.props(styles.body)}>{text.body}</p>
      </div>
      <div {...stylex.props(styles.buttons)}>
        <Button
          variant="secondary"
          icon={LogOut}
          fullWidth
          disabled={busy}
          onClick={onThisDevice}
          xstyle={styles.ring}
        >
          {text.thisDevice}
        </Button>
        <Button
          icon={MonitorSmartphone}
          fullWidth
          disabled={busy || !online}
          onClick={onAllDevices}
        >
          {text.allDevices}
        </Button>
        <Button variant="ghost" fullWidth onClick={onCancel}>
          {text.cancel}
        </Button>
      </div>
      {state.kind === "failed" && (
        <p role="alert" {...stylex.props(styles.failed)}>
          {text.failed}
        </p>
      )}
    </Dialog>
  );
}
