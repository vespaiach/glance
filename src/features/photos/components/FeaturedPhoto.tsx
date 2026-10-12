import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight, Image, Pause, Play } from "lucide-react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { photoMeta } from "../slideshow";

type FeaturedPhotoProps = {
  photo: Photo;
  src: string;
  playing: boolean;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
  frame: stylex.StyleXStyles;
};

const styles = stylex.create({
  image: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    width: "100%",
    objectFit: "cover",
    borderRadius: radii.md,
    display: "block",
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
    gap: 6,
    minWidth: 0,
  },
  title: {
    margin: 0,
    fontSize: type.displayLgSize,
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
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
  playing,
  onStep,
  onTogglePlay,
  frame,
}: FeaturedPhotoProps) {
  return (
    <>
      {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
      <img src={src} alt={photo.title} {...stylex.props(styles.image, frame)} />
      <div {...stylex.props(styles.footer)}>
        <div {...stylex.props(styles.text)}>
          <Eyebrow>{photoMeta(photo)}</Eyebrow>
          <h2 {...stylex.props(styles.title)}>{photo.title}</h2>
        </div>
        <div {...stylex.props(styles.controls)}>
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
