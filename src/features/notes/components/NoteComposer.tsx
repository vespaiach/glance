import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { copy } from "@/copy";
import { NOTE_LIMITS } from "@/domain/schemas";
import { colors } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { TextInput } from "@/ui/TextInput";
import type { NoteDraft } from "../noteSheet";

type NoteComposerProps = {
  draft: NoteDraft;
  textError: boolean;
  onText: (value: string) => void;
  onAuthor: (value: string) => void;
};

const words = copy.notes.sheet;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  message: {
    width: "100%",
    fieldSizing: "content",
    minHeight: "1.25em",
    maxHeight: "50vh",
    overflowY: "auto",
    borderWidth: 0,
    outline: "none",
    resize: "none",
    padding: 0,
    margin: 0,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: type.fontSans,
    fontSize: "clamp(28px, 2.8vw, 40px)",
    fontWeight: 400,
    lineHeight: 1.25,
    letterSpacing: "-0.4px",
  },
  error: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    color: colors.danger,
  },
});

export function NoteComposer({ draft, textError, onText, onAuthor }: NoteComposerProps) {
  const errorId = useId();

  return (
    <div {...stylex.props(styles.root)}>
      <textarea
        data-autofocus
        aria-label={words.message}
        aria-invalid={textError || undefined}
        aria-describedby={textError ? errorId : undefined}
        placeholder={words.messagePlaceholder}
        maxLength={NOTE_LIMITS.text}
        rows={1}
        value={draft.text}
        onChange={(event) => onText(event.target.value)}
        {...stylex.props(styles.message)}
      />
      {textError && (
        <span id={errorId} {...stylex.props(styles.error)}>
          {words.writeMessage}
        </span>
      )}
      <TextInput
        label={words.name}
        placeholder={words.namePlaceholder}
        value={draft.author}
        maxLength={NOTE_LIMITS.author}
        onChange={onAuthor}
      />
    </div>
  );
}
