import * as stylex from "@stylexjs/stylex";
import { Plus } from "lucide-react";
import { copy } from "@/copy";
import { type Tag, type TagColor, TagColorSchema } from "@/domain/schemas";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";

type NewMemberProps = {
  name: string;
  color: TagColor;
  onColor: (color: TagColor) => void;
  onCreate: () => void;
};

type SuggestionsProps = {
  tags: readonly Tag[];
  onAdd: (id: string) => void;
};

const words = copy.events.who;

const _MAX_NAME = 32;

const styles = stylex.create({
  tile: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: 24,
    paddingBlock: 16,
    paddingInlineStart: 20,
    paddingInlineEnd: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  tileTop: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  tileName: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  mono: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
  preview: {
    height: 40,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    paddingInline: 16,
    maxWidth: "100%",
    borderRadius: radii.full,
    fontSize: 16,
    fontWeight: 480,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  swatches: {
    borderWidth: 0,
    margin: 0,
    padding: 0,
    minWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 44,
    height: 44,
    borderWidth: 0,
    padding: 0,
    borderRadius: radii.full,
    cursor: "pointer",
    transitionProperty: "transform, box-shadow",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  },
  picked: {
    boxShadow: `0 0 0 3px ${colors.white}, 0 0 0 5px ${colors.black}`,
  },
  suggestions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  suggestionList: {
    borderWidth: 0,
    margin: 0,
    padding: 0,
    minWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestion: {
    minHeight: 48,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingInlineStart: 14,
    paddingInlineEnd: 18,
    fontFamily: type.fontSans,
    fontSize: 16,
    fontWeight: 480,
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
});

const fills = stylex.create({
  lilac: { backgroundColor: colors.blockLilac },
  sky: { backgroundColor: colors.blockSky },
  coral: { backgroundColor: colors.blockCoral },
  mint: { backgroundColor: colors.blockMint },
  sun: { backgroundColor: colors.blockSun },
  pink: { backgroundColor: colors.blockPink },
  lime: { backgroundColor: colors.blockLime },
  rust: { backgroundColor: colors.blockRust },
  glacier: { backgroundColor: colors.blockGlacier },
  amber: { backgroundColor: colors.blockAmber },
  sage: { backgroundColor: colors.blockSage },
  ice: { backgroundColor: colors.blockIce },
});

export function NewMember({ name, color, onColor, onCreate }: NewMemberProps) {
  return (
    <div {...stylex.props(styles.tile)}>
      <div {...stylex.props(styles.tileTop)}>
        <div {...stylex.props(styles.tileName)}>
          <span {...stylex.props(styles.mono)}>{words.newMember}</span>
          <span {...stylex.props(styles.preview, fills[color])}>{name}</span>
        </div>
        <Button icon={Plus} onClick={onCreate}>
          {words.addMember}
        </Button>
      </div>
      <fieldset aria-label={words.memberColor} {...stylex.props(styles.swatches)}>
        {TagColorSchema.options.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={copy.tags.colors[option]}
            aria-pressed={option === color}
            onClick={() => onColor(option)}
            {...stylex.props(
              styles.swatch,
              fills[option],
              option === color && styles.picked,
              press.scale,
            )}
          />
        ))}
      </fieldset>
    </div>
  );
}

export function Suggestions({ tags, onAdd }: SuggestionsProps) {
  if (tags.length === 0) return null;

  return (
    <div {...stylex.props(styles.suggestions)}>
      <span aria-hidden="true" {...stylex.props(styles.mono)}>
        {words.suggestions}
      </span>
      <fieldset aria-label={words.suggestions} {...stylex.props(styles.suggestionList)}>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onAdd(tag.id)}
            {...stylex.props(styles.suggestion, press.scale)}
          >
            <PersonDot color={tag.color} />
            {tag.name}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
