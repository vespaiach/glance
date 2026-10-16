import * as stylex from "@stylexjs/stylex";
import { Image, Upload } from "lucide-react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { photoMeta } from "@/features/photos";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";

type PictureOfDayProps = {
  photo: Photo;
  src: string;
};

type PictureOfDayEmptyProps = {
  canUpload: boolean;
  onUpload: () => void;
};

const styles = stylex.create({
  root: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 120,
    marginTop: space.xs,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: space.sm,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(140px, 1fr)",
    gap: space.md,
  },
  frame: {
    position: "relative",
    minHeight: 96,
  },
  image: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: radii.md,
    display: "block",
  },
  caption: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: space.sm,
    paddingBlock: space.xxs,
    paddingInlineEnd: space.xxs,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  title: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
    lineHeight: 1.25,
    textWrap: "pretty",
  },
  meta: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  empty: {
    flexShrink: 0,
    minHeight: 120,
    marginTop: space.xs,
    borderRadius: radii.lg,
    boxShadow: shadows.shadow1,
    paddingBlock: 20,
    paddingInline: space.lg,
    boxSizing: "border-box",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  emptyText: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    minWidth: 0,
  },
  emptyLines: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
  },
  emptyBody: {
    fontSize: 17,
    fontWeight: 330,
  },
});

export function PictureOfDay({ photo, src }: PictureOfDayProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.frame)}>
        {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
        <img src={src} alt={photo.title} {...stylex.props(styles.image)} />
      </div>
      <div {...stylex.props(styles.caption)}>
        <Eyebrow>{copy.today.picture.eyebrow}</Eyebrow>
        <div {...stylex.props(styles.text)}>
          <span {...stylex.props(styles.title)}>{photo.title}</span>
          <span {...stylex.props(styles.meta)}>{photoMeta(photo)}</span>
        </div>
      </div>
    </div>
  );
}

export function PictureOfDayEmpty({ canUpload, onUpload }: PictureOfDayEmptyProps) {
  return (
    <div {...stylex.props(styles.empty)}>
      <div {...stylex.props(styles.emptyText)}>
        <Icon icon={Image} size={28} strokeWidth={1.5} />
        <div {...stylex.props(styles.emptyLines)}>
          <Eyebrow>{copy.today.picture.eyebrow}</Eyebrow>
          <span {...stylex.props(styles.emptyBody)}>{copy.today.picture.emptyBody}</span>
        </div>
      </div>
      {canUpload && (
        <Button variant="ghost" icon={Upload} onClick={onUpload}>
          {copy.today.picture.upload}
        </Button>
      )}
    </div>
  );
}

export function PictureOfDaySkeleton() {
  return (
    <Skeleton label={copy.today.picture.loading} xstyle={styles.root}>
      <SkeletonBlock height="100%" radius={radii.md} />
    </Skeleton>
  );
}
