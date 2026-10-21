"use client";

import * as stylex from "@stylexjs/stylex";
import { ArrowRight, ImagePlus, Upload } from "lucide-react";
import { type ReactNode, useState } from "react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
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
  onOpenPhotos: () => void;
  canUpload: boolean;
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
  memory: {
    flexGrow: 1,
    minHeight: 160,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderHairline,
    borderRadius: radii.md,
    backgroundColor: season.soft,
    padding: space.lg,
    boxSizing: "border-box",
    textAlign: "start",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.lg,
  },
  memoryText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 20,
  },
  memoryLines: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  prompt: {
    fontSize: "clamp(22px, 1.6vw, 30px)",
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
    textWrap: "pretty",
  },
  memoryBody: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  pill: {
    height: 44,
    paddingInline: 20,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 17,
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

export function PictureOfDayEmpty({ onOpenPhotos, canUpload, xstyle }: PictureOfDayEmptyProps) {
  const [prompt] = useState(randomPrompt);

  return (
    <button
      type="button"
      onClick={onOpenPhotos}
      {...stylex.props(styles.tap, styles.memory, press.scale, xstyle)}
    >
      <Icon icon={ImagePlus} size={32} strokeWidth={1.5} />
      <span {...stylex.props(styles.memoryText)}>
        <span {...stylex.props(styles.memoryLines)}>
          <span {...stylex.props(styles.prompt)}>{`“${prompt}”`}</span>
          <span {...stylex.props(styles.memoryBody)}>{copy.today.picture.emptyBody}</span>
        </span>
        {canUpload && (
          <span {...stylex.props(styles.pill)}>
            <Icon icon={Upload} size={18} />
            {copy.today.picture.upload}
          </span>
        )}
      </span>
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

function randomPrompt(): string {
  const { prompts } = copy.today.picture;

  return prompts[Math.floor(Math.random() * prompts.length)] ?? "";
}
