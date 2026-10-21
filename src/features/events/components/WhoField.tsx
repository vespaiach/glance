import * as stylex from "@stylexjs/stylex";
import { Plus, X } from "lucide-react";
import { type KeyboardEvent, useId } from "react";
import { copy } from "@/copy";
import { type Tag, type TagColor, TagColorSchema } from "@/domain/schemas";
import { suggestTags } from "@/domain/tagMatch";
import { exactTag } from "@/domain/tags";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";

type WhoFieldProps = {
  tags: readonly Tag[];
  tagIds: readonly string[];
  input: string;
  newColor: TagColor;
  onInput: (value: string) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onColor: (color: TagColor) => void;
  onCreate: () => void;
};

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

const MAX_NAME = 32;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  label: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
  },
  field: {
    minHeight: 56,
    minWidth: 0,
    boxSizing: "border-box",
    margin: 0,
    padding: 5,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.borderHairline,
      ":focus-within": colors.black,
    },
    borderRadius: radii.md,
    boxShadow: {
      default: "none",
      ":focus-within": `0 0 0 2px ${colors.focusRing}`,
    },
    backgroundColor: colors.surfaceCanvas,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    transitionProperty: "box-shadow",
    transitionDuration: motion.durFast,
  },
  pill: {
    height: 44,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 2,
    paddingInlineStart: 16,
    paddingInlineEnd: 4,
    borderRadius: radii.full,
    fontSize: 16,
    fontWeight: 480,
    whiteSpace: "nowrap",
  },
  remove: {
    width: 36,
    height: 36,
    borderWidth: 0,
    padding: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 140,
    height: 44,
    borderWidth: 0,
    outline: "none",
    backgroundColor: "transparent",
    paddingBlock: 0,
    paddingInline: 10,
    fontFamily: type.fontSans,
    fontSize: type.bodySize,
    fontWeight: type.bodyWeight,
    letterSpacing: type.bodyLs,
    color: colors.textPrimary,
  },
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

export function WhoField({
  tags,
  tagIds,
  input,
  newColor,
  onInput,
  onAdd,
  onRemove,
  onColor,
  onCreate,
}: WhoFieldProps) {
  const inputId = useId();

  const selected = tagIds.flatMap((id) => tags.filter((tag) => tag.id === id));

  const exact = exactTag(tags, input);

  const name = input.trim();

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = selected.at(-1);

    if (event.key === "Backspace" && input === "" && last) return onRemove(last.id);

    if (event.key !== "Enter") return;

    event.preventDefault();

    if (exact) onAdd(exact.id);
    else if (name !== "") onCreate();
  };

  return (
    <div {...stylex.props(styles.root)}>
      <label htmlFor={inputId} {...stylex.props(styles.label)}>
        {copy.events.sheet.who}
      </label>
      <fieldset aria-label={words.people} {...stylex.props(styles.field)}>
        {selected.map((tag) => (
          <span key={tag.id} {...stylex.props(styles.pill, fills[tag.color])}>
            {tag.name}
            <button
              type="button"
              aria-label={words.remove(tag.name)}
              onClick={() => onRemove(tag.id)}
              {...stylex.props(styles.remove, press.scale)}
            >
              <Icon icon={X} size={16} />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          value={input}
          maxLength={MAX_NAME}
          placeholder={selected.length > 0 ? words.addSomeoneElse : words.addPerson}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={onKeyDown}
          {...stylex.props(styles.input)}
        />
      </fieldset>
      {name !== "" && !exact && (
        <NewMember name={name} color={newColor} onColor={onColor} onCreate={onCreate} />
      )}
      <Suggestions tags={suggestTags(tags, input, tagIds)} onAdd={onAdd} />
    </div>
  );
}

function NewMember({ name, color, onColor, onCreate }: NewMemberProps) {
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

function Suggestions({ tags, onAdd }: SuggestionsProps) {
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
