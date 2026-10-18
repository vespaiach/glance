import * as stylex from "@stylexjs/stylex";
import { ImagePlus } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";

type PictureOfDayProps = {
  photo: Photo;
  onThisDay?: number;
  src: string;
  onOpen: () => void;
};

type PictureOfDayEmptyProps = {
  onUpload: () => void;
};

type SlotProps = {
  label: string;
  title: string;
  name?: string;
  thumb: ReactNode;
  onClick: () => void;
};

const THUMB_SIZE = "clamp(56px, min(14vh, 40%), 120px)";

const styles = stylex.create({
  root: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
    minHeight: 56,
    maxWidth: 420,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 20,
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  thumb: {
    width: THUMB_SIZE,
    aspectRatio: "1",
    flexShrink: 0,
    objectFit: "cover",
    borderRadius: radii.md,
    display: "block",
  },
  outline: {
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontFamily: type.fontMono,
    fontSize: type.eyebrowSize,
    letterSpacing: type.eyebrowLs,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  title: {
    fontSize: 18,
    fontWeight: 480,
    lineHeight: 1.25,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  skeleton: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    maxWidth: 420,
  },
  skeletonLines: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
});

export function PictureOfDay({ photo, onThisDay, src, onOpen }: PictureOfDayProps) {
  return (
    <Slot
      label={
        onThisDay === undefined
          ? copy.today.picture.eyebrow
          : copy.today.picture.onThisDay(onThisDay)
      }
      title={photo.title}
      name={copy.today.picture.name(photo.title)}
      thumb={
        // biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer
        <img src={src} alt="" {...stylex.props(styles.thumb)} />
      }
      onClick={onOpen}
    />
  );
}

export function PictureOfDayEmpty({ onUpload }: PictureOfDayEmptyProps) {
  return (
    <Slot
      label={copy.today.picture.eyebrow}
      title={copy.today.picture.upload}
      thumb={
        <span {...stylex.props(styles.thumb, styles.outline)}>
          <Icon icon={ImagePlus} size={32} strokeWidth={1.5} />
        </span>
      }
      onClick={onUpload}
    />
  );
}

export function PictureOfDaySkeleton() {
  return (
    <Skeleton label={copy.today.picture.loading} xstyle={styles.skeleton}>
      <SkeletonBlock width={THUMB_SIZE} height={THUMB_SIZE} radius={radii.md} />
      <div {...stylex.props(styles.skeletonLines)}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="80%" height={18} />
      </div>
    </Skeleton>
  );
}

function Slot({ label, title, name, thumb, onClick }: SlotProps) {
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onClick}
      {...stylex.props(styles.root, press.scale)}
    >
      {thumb}
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.label)}>{label}</span>
        <span {...stylex.props(styles.title)}>{title}</span>
      </span>
    </button>
  );
}
