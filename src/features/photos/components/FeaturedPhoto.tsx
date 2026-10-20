"use client";

import * as stylex from "@stylexjs/stylex";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Image,
  Maximize,
  Pause,
  Pencil,
  Play,
} from "lucide-react";
import { useCallback, useState } from "react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { photoHint, photoMeta } from "../slideshow";

type FeaturedPhotoProps = {
  photo: Photo;
  src: string;
  thisYear: number;
  playing: boolean;
  isBackground: boolean;
  onEdit: () => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
  onFullScreen: () => void;
  onSetBackground: () => void;
  onOpenBackground: () => void;
  frame: stylex.StyleXStyles;
};

const styles = stylex.create({
  image: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    width: "100%",
    objectFit: "cover",
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    display: "block",
    cursor: "zoom-in",
  },
  portrait: {
    objectFit: "contain",
  },
  background: {
    display: "flex",
    alignItems: "center",
    height: 56,
    marginLeft: -16,
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: space.md,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  title: {
    margin: 0,
    fontSize: type.displayLgSize,
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
  },
  hint: {
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
    maxWidth: 440,
  },
  controls: {
    display: "flex",
    gap: space.xs,
  },
  waiting: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    width: "100%",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceCanvas,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    padding: space.lg,
    boxSizing: "border-box",
    textAlign: "center",
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
    maxWidth: 360,
  },
});

export function FeaturedPhoto({
  photo,
  src,
  thisYear,
  playing,
  isBackground,
  onEdit,
  onStep,
  onTogglePlay,
  onFullScreen,
  onSetBackground,
  onOpenBackground,
  frame,
}: FeaturedPhotoProps) {
  const hint = photoHint(photo);

  const [portraitSrc, setPortraitSrc] = useState<string>();

  const measure = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.naturalWidth > 0)
        setPortraitSrc(isPortrait(image) ? src : undefined);
    },
    [src],
  );

  return (
    <>
      {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the Full screen button is the keyboard path */}
      <img
        src={src}
        alt={photo.title}
        onClick={onFullScreen}
        ref={measure}
        onLoad={(event) => measure(event.currentTarget)}
        {...stylex.props(styles.image, portraitSrc === src && styles.portrait, frame)}
      />
      <div {...stylex.props(styles.footer)}>
        <div {...stylex.props(styles.text)}>
          <Eyebrow>{photoMeta(photo, thisYear)}</Eyebrow>
          <h2 {...stylex.props(styles.title)}>{photo.title}</h2>
          {hint && <span {...stylex.props(styles.hint)}>{hint}</span>}
          <div {...stylex.props(styles.background)}>
            {isBackground ? (
              <Button variant="ghost" icon={Check} onClick={onOpenBackground}>
                {copy.photos.backgroundNow}
              </Button>
            ) : (
              <Button variant="ghost" icon={Image} onClick={onSetBackground}>
                {copy.photos.setBackground}
              </Button>
            )}
          </div>
        </div>
        <div {...stylex.props(styles.controls)}>
          <IconButton
            icon={Pencil}
            label={copy.photos.edit}
            variant="canvas"
            size="touch"
            onClick={onEdit}
          />
          <IconButton
            icon={ChevronLeft}
            label={copy.photos.previous}
            variant="canvas"
            size="touch"
            onClick={() => onStep(-1)}
          />
          <IconButton
            icon={playing ? Pause : Play}
            label={playing ? copy.photos.pause : copy.photos.play}
            variant="canvas"
            size="touch"
            onClick={onTogglePlay}
          />
          <IconButton
            icon={ChevronRight}
            label={copy.photos.next}
            variant="canvas"
            size="touch"
            onClick={() => onStep(1)}
          />
          <IconButton
            icon={Maximize}
            label={copy.photos.fullScreen}
            variant="canvas"
            size="touch"
            onClick={onFullScreen}
          />
        </div>
      </div>
    </>
  );
}

export function FeaturedWaiting({ frame }: { frame: stylex.StyleXStyles }) {
  return (
    <div {...stylex.props(styles.waiting, frame)}>
      <Icon icon={Image} size={40} strokeWidth={1.5} />
      <span {...stylex.props(styles.waitingText)}>{copy.photos.waitingForUploads}</span>
    </div>
  );
}

function isPortrait(image: HTMLImageElement): boolean {
  return image.naturalHeight > image.naturalWidth;
}
