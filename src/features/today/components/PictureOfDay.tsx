import * as stylex from "@stylexjs/stylex";
import { ArrowRight, ImagePlus } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";

type PictureOfDayPanelProps = {
  onThisDay?: number;
  onOpenPhotos: () => void;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

type PictureOfDayProps = {
  photo: Photo;
  src: string;
  onOpen: () => void;
  xstyle?: stylex.StyleXStyles;
};

type PictureOfDayEmptyProps = {
  onUpload: () => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  panel: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: space.md,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.xs,
    paddingInlineStart: space.xs,
  },
  tap: {
    borderWidth: 0,
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  photo: {
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: "transparent",
    padding: 0,
    textAlign: "start",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  image: {
    flexGrow: 1,
    minHeight: "inherit",
    width: "100%",
    objectFit: "cover",
    borderRadius: radii.md,
    display: "block",
  },
  title: {
    fontSize: type.bodyLgSize,
    fontWeight: 480,
    lineHeight: 1.25,
    paddingInline: space.xs,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  upload: {
    flexGrow: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    padding: space.lg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    fontSize: type.bodyLgSize,
    fontWeight: 480,
  },
  grow: { flexGrow: 1 },
  skeleton: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
});

export function PictureOfDayPanel({
  onThisDay,
  onOpenPhotos,
  children,
  xstyle,
}: PictureOfDayPanelProps) {
  return (
    <section {...stylex.props(styles.panel, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>
          {onThisDay === undefined
            ? copy.today.picture.eyebrow
            : copy.today.picture.onThisDay(onThisDay)}
        </Eyebrow>
        <Button variant="ghost" iconRight={ArrowRight} onClick={onOpenPhotos}>
          {copy.today.picture.allPhotos}
        </Button>
      </div>
      {children}
    </section>
  );
}

export function PictureOfDay({ photo, src, onOpen, xstyle }: PictureOfDayProps) {
  return (
    <button
      type="button"
      aria-label={copy.today.picture.name(photo.title)}
      onClick={onOpen}
      {...stylex.props(styles.tap, styles.photo, press.scale, xstyle)}
    >
      {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
      <img src={src} alt="" {...stylex.props(styles.image)} />
      <span {...stylex.props(styles.title)}>{photo.title}</span>
    </button>
  );
}

export function PictureOfDayEmpty({ onUpload, xstyle }: PictureOfDayEmptyProps) {
  return (
    <button
      type="button"
      onClick={onUpload}
      {...stylex.props(styles.tap, styles.upload, press.scale, xstyle)}
    >
      <Icon icon={ImagePlus} size={32} strokeWidth={1.5} />
      {copy.today.picture.upload}
    </button>
  );
}

export function PictureOfDaySkeleton({ xstyle }: { xstyle?: stylex.StyleXStyles }) {
  return (
    <Skeleton label={copy.today.picture.loading} xstyle={[styles.skeleton, xstyle]}>
      <SkeletonBlock height={160} radius={radii.md} xstyle={styles.grow} />
      <SkeletonBlock width="60%" height={18} />
    </Skeleton>
  );
}
