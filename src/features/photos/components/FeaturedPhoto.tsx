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
  Trash2,
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
  online: boolean;
  deleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
  onFullScreen: () => void;
  onSetBackground: () => void;
  onOpenBackground: () => void;
  frame: stylex.StyleXStyles;
};

type PhotoActionsProps = Pick<
  FeaturedPhotoProps,
  | "isBackground"
  | "online"
  | "deleting"
  | "onEdit"
  | "onAskDelete"
  | "onCancelDelete"
  | "onDelete"
  | "onSetBackground"
  | "onOpenBackground"
>;

type SlideshowButtonsProps = Pick<
  FeaturedPhotoProps,
  "playing" | "onStep" | "onTogglePlay" | "onFullScreen"
>;

const styles = stylex.create({
  image: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    width: "100%",
    height: 0,
    minWidth: 0,
    objectFit: "cover",
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    display: "block",
    cursor: "zoom-in",
  },
  portrait: {
    objectFit: "contain",
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    minWidth: 0,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    rowGap: space.xs,
    columnGap: space.md,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: space.xxs,
    marginLeft: -16,
  },
  confirm: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    marginLeft: space.sm,
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
  frame,
  playing,
  onStep,
  onTogglePlay,
  onFullScreen,
  ...actions
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
        </div>
        <div {...stylex.props(styles.actionRow)}>
          <PhotoActions {...actions} />
          <SlideshowButtons
            playing={playing}
            onStep={onStep}
            onTogglePlay={onTogglePlay}
            onFullScreen={onFullScreen}
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

function PhotoActions({
  isBackground,
  online,
  deleting,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onSetBackground,
  onOpenBackground,
}: PhotoActionsProps) {
  return (
    <div {...stylex.props(styles.actions)}>
      {isBackground ? (
        <Button variant="ghost" icon={Check} onClick={onOpenBackground}>
          {copy.photos.backgroundNow}
        </Button>
      ) : (
        <Button variant="ghost" icon={Image} onClick={onSetBackground}>
          {copy.photos.setBackground}
        </Button>
      )}
      <Button variant="ghost" icon={Pencil} onClick={onEdit}>
        {copy.photos.edit}
      </Button>
      {online && !deleting && (
        <Button variant="ghost" icon={Trash2} onClick={onAskDelete}>
          {copy.photos.delete}
        </Button>
      )}
      {online && deleting && (
        <div
          role="alertdialog"
          aria-label={copy.photos.deleteName}
          {...stylex.props(styles.confirm)}
        >
          <Button variant="danger" icon={Trash2} onClick={onDelete}>
            {copy.photos.confirmDelete}
          </Button>
          <Button variant="ghost" onClick={onCancelDelete}>
            {copy.photos.cancelDelete}
          </Button>
        </div>
      )}
    </div>
  );
}

function SlideshowButtons({ playing, onStep, onTogglePlay, onFullScreen }: SlideshowButtonsProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: the slideshow buttons are a toolbar row, not a form fieldset
    <div role="group" aria-label={copy.photos.slideshow} {...stylex.props(styles.controls)}>
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
        variant="solid"
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
  );
}

function isPortrait(image: HTMLImageElement): boolean {
  return image.naturalHeight > image.naturalWidth;
}
