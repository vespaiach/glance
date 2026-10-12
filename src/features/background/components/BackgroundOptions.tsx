import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { ShownBackground } from "@/domain/background";
import type { AccountSettings } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { PillTabs } from "@/ui/PillTabs";

type Background = AccountSettings["background"];

type BackgroundOptionsProps = {
  background: Background;
  shown: ShownBackground;
  previewSrc?: string;
  onChange: (change: Partial<Background>) => void;
};

type DimOption = (typeof copy.background.dim.options)[number]["value"];

const DIMS: Record<DimOption, Background["dim"]> = { "0": 0, "0.2": 0.2, "0.4": 0.4 };

const styles = stylex.create({
  block: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
  },
  preview: {
    alignSelf: "stretch",
    aspectRatio: "16 / 10",
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceCanvas,
    paddingTop: space.sm,
    paddingInline: space.sm,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "3fr 4fr 3fr",
    gridTemplateRows: "minmax(0, 1fr) 16px",
    gap: 6,
    transitionProperty: "background",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  },
  photo: (image: string) => ({
    backgroundImage: image,
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  }),
  panel: {
    borderRadius: 5,
  },
  block1: {
    backgroundColor: season.block1,
  },
  canvas: {
    backgroundColor: colors.surfaceCanvas,
  },
  block3: {
    backgroundColor: season.block3,
  },
  bar: {
    gridColumn: "1 / -1",
    marginInline: `calc(-1 * ${space.sm})`,
    backgroundColor: colors.surfaceCanvas,
  },
  caption: {
    margin: 0,
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
});

function photoLayer(dim: Background["dim"], src: string): string {
  const shade = `rgba(0, 0, 0, ${dim})`;

  return `linear-gradient(${shade}, ${shade}), url("${src}")`;
}

function caption(shown: ShownBackground): string {
  const text = copy.background.caption;

  switch (shown.mode) {
    case "season":
      return text.season;
    case "photo":
      return text.photo(shown.photo.title);
    case "slideshow":
      return text.slideshow(shown.photo.title, copy.background.interval[shown.rotate]);
  }
}

function Preview({ dim, src }: { dim: Background["dim"]; src?: string }) {
  return (
    <div
      role="img"
      aria-label={copy.background.preview}
      {...stylex.props(styles.preview, src !== undefined && styles.photo(photoLayer(dim, src)))}
    >
      <div {...stylex.props(styles.panel, styles.block1)} />
      <div {...stylex.props(styles.panel, styles.canvas)} />
      <div {...stylex.props(styles.panel, styles.block3)} />
      <div {...stylex.props(styles.bar)} />
    </div>
  );
}

export function BackgroundOptions({
  background,
  shown,
  previewSrc,
  onChange,
}: BackgroundOptionsProps) {
  const text = copy.background;

  return (
    <ColorBlock tone="soft" padding="clamp(20px, 2.4vw, 32px)" xstyle={styles.block}>
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.preview}</Eyebrow>
        <Preview dim={background.dim} src={previewSrc} />
      </div>
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.dim.title}</Eyebrow>
        <PillTabs
          label={text.dim.title}
          options={text.dim.options}
          value={`${background.dim}` as const}
          onChange={(value) => onChange({ dim: DIMS[value] })}
        />
      </div>
      {background.mode === "slideshow" && (
        <div {...stylex.props(styles.group)}>
          <Eyebrow>{text.rotate.title}</Eyebrow>
          <PillTabs
            label={text.rotate.title}
            options={text.rotate.options}
            value={background.rotate}
            onChange={(value) => onChange({ rotate: value })}
          />
        </div>
      )}
      <p {...stylex.props(styles.caption)}>{caption(shown)}</p>
    </ColorBlock>
  );
}
