import * as stylex from "@stylexjs/stylex";
import { Check, CircleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { dialogKeyDown, useFocusOnOpen } from "@/ui/dialogFocus";
import { Icon } from "@/ui/Icon";
import type { ScanAction } from "../scan";
import { useQrReader } from "../useQrReader";

type ScannerProps = {
  step: "asking" | "scanning" | "wrong" | "found";
  stream?: MediaStream;
  onAction: (action: ScanAction) => void;
};

const text = copy.signIn.scan;

const styles = stylex.create({
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: colors.black,
    color: colors.white,
    outline: "none",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  top: {
    position: "relative",
    zIndex: 1,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    minHeight: 72,
    paddingBlock: 16,
    paddingInline: 24,
    boxSizing: "border-box",
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  middle: {
    position: "relative",
    flexGrow: 1,
    minHeight: 0,
    display: "grid",
    placeItems: "center",
  },
  frame: {
    width: "min(264px, 70vw)",
    aspectRatio: "1",
    borderRadius: 24,
    display: "grid",
    placeItems: "center",
    boxShadow: `0 0 0 2000px ${colors.scrim}, inset 0 0 0 3px ${colors.white}`,
    transitionProperty: "box-shadow",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  frameFound: {
    boxShadow: `0 0 0 2000px ${colors.scrim}, inset 0 0 0 4px ${season.block1}`,
  },
  check: {
    display: "grid",
    placeItems: "center",
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: season.block1,
    color: colors.black,
  },
  bottom: {
    position: "relative",
    zIndex: 1,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
    paddingTop: 24,
    paddingInline: 24,
    paddingBottom: 32,
    boxSizing: "border-box",
    textAlign: "center",
  },
  wrong: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
    maxWidth: 400,
    boxSizing: "border-box",
    paddingBlock: 16,
    paddingInline: 20,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    textAlign: "left",
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
  },
  wrongIcon: {
    display: "flex",
    flexShrink: 0,
  },
  hint: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxWidth: 320,
  },
  hintFound: {
    minHeight: 112,
  },
  hintTitle: {
    fontSize: 20,
    fontWeight: 540,
    letterSpacing: "-0.2px",
    lineHeight: 1.3,
  },
  hintBody: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
});

export function Scanner({ step, stream, onAction }: ScannerProps) {
  const root = useRef<HTMLDivElement>(null);

  const video = useRef<HTMLVideoElement>(null);

  const frame = useRef<HTMLDivElement>(null);

  const found = step === "found";

  const close = () => onAction({ type: "close" });

  useFocusOnOpen(root);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream ?? null;
  }, [stream]);

  useQrReader(video, frame, stream !== undefined && !found, (code) =>
    onAction({ type: "read", text: code, origin: window.location.origin }),
  );

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={text.title}
      tabIndex={-1}
      onKeyDown={dialogKeyDown(close)}
      {...stylex.props(styles.root)}
    >
      <video ref={video} autoPlay muted playsInline {...stylex.props(styles.video)} />
      <div {...stylex.props(styles.top)}>{text.title}</div>
      <div {...stylex.props(styles.middle)}>
        <div ref={frame} {...stylex.props(styles.frame, found && styles.frameFound)}>
          {found && (
            <span {...stylex.props(styles.check)}>
              <Icon icon={Check} size={48} strokeWidth={1.75} />
            </span>
          )}
        </div>
      </div>
      <div {...stylex.props(styles.bottom)}>
        {step === "wrong" && (
          <div role="alert" {...stylex.props(styles.wrong)}>
            <span {...stylex.props(styles.wrongIcon)}>
              <Icon icon={CircleAlert} size={22} />
            </span>
            <span>{text.wrong}</span>
          </div>
        )}
        <div role="status" {...stylex.props(styles.hint, found && styles.hintFound)}>
          <span {...stylex.props(styles.hintTitle)}>{found ? text.found : text.point}</span>
          <span {...stylex.props(styles.hintBody)}>{found ? text.signingIn : text.where}</span>
        </div>
        {!found && (
          <Button variant="inverse" onClick={close}>
            {text.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}
