"use client";

import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight, Minimize, Pause, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { colors, sizes, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { IconButton } from "@/ui/IconButton";
import { photoMeta } from "../slideshow";

type FullScreenPhotoProps = {
  photo: Photo;
  src: string;
  index: number;
  total: number;
  thisYear: number;
  playing: boolean;
  chrome: boolean;
  onExit: () => void;
  onToggleChrome: () => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
};

type KeyActions = Pick<FullScreenPhotoProps, "onExit" | "onStep" | "onTogglePlay">;

const styles = stylex.create({
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 20,
    backgroundColor: colors.black,
    color: colors.white,
    display: "flex",
    flexDirection: "column",
    outline: "none",
  },
  top: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
    padding: `${space.md} ${sizes.kioskGutter}`,
    boxSizing: "border-box",
    minHeight: 88,
  },
  count: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.7px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    position: "relative",
    cursor: "pointer",
  },
  image: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },
  bottom: {
    flexShrink: 0,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: `${space.md} ${space.lg}`,
    padding: `20px ${sizes.kioskGutter} ${space.lg}`,
    boxSizing: "border-box",
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  title: {
    fontSize: "clamp(24px, 2.4vw, 36px)",
    fontWeight: 340,
    letterSpacing: "-0.5px",
    lineHeight: 1.15,
  },
  meta: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.65px",
    textTransform: "uppercase",
  },
  controls: {
    display: "flex",
    gap: space.xs,
  },
});

export function FullScreenPhoto({
  photo,
  src,
  index,
  total,
  thisYear,
  playing,
  chrome,
  onExit,
  onToggleChrome,
  onStep,
  onTogglePlay,
}: FullScreenPhotoProps) {
  const dialog = useFocusOnOpen();

  useKeys({ onExit, onStep, onTogglePlay });

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={copy.photos.fullScreenName(photo.title)}
      tabIndex={-1}
      {...stylex.props(styles.root)}
    >
      {chrome && (
        <div {...stylex.props(styles.top)}>
          <span {...stylex.props(styles.count)}>{copy.photos.position(index + 1, total)}</span>
          <IconButton
            icon={Minimize}
            label={copy.photos.exitFullScreen}
            variant="inverse"
            size="touch"
            onClick={onExit}
          />
        </div>
      )}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: tapping the photo only hides or shows the rows; the keyboard has Esc, the arrows and Space */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keys are handled on the window for the whole dialog */}
      <div onClick={onToggleChrome} {...stylex.props(styles.stage)}>
        {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
        <img src={src} alt={photo.title} {...stylex.props(styles.image)} />
      </div>
      {chrome && (
        <div {...stylex.props(styles.bottom)}>
          <div {...stylex.props(styles.text)}>
            <span {...stylex.props(styles.title)}>{photo.title}</span>
            <span {...stylex.props(styles.meta)}>{photoMeta(photo, thisYear)}</span>
          </div>
          <div {...stylex.props(styles.controls)}>
            <IconButton
              icon={ChevronLeft}
              label={copy.photos.previous}
              variant="inverse"
              size="touch"
              onClick={() => onStep(-1)}
            />
            <IconButton
              icon={playing ? Pause : Play}
              label={playing ? copy.photos.pause : copy.photos.play}
              variant="inverse"
              size="touch"
              onClick={onTogglePlay}
            />
            <IconButton
              icon={ChevronRight}
              label={copy.photos.next}
              variant="inverse"
              size="touch"
              onClick={() => onStep(1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function useKeys(actions: KeyActions) {
  const latest = useRef(actions);

  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { onExit, onStep, onTogglePlay } = latest.current;

      if (event.key === "Escape") return onExit();

      if (event.key === "ArrowLeft") return onStep(-1);

      if (event.key === "ArrowRight") return onStep(1);

      if (event.key !== " ") return;

      event.preventDefault();
      onTogglePlay();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function useFocusOnOpen() {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement;

    dialog.current?.focus();

    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return dialog;
}
