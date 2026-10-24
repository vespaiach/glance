import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  text: {
    marginTop: -12,
    fontSize: "clamp(24px, 2.4vw, 32px)",
    fontWeight: 400,
    letterSpacing: "-0.4px",
    lineHeight: 1.25,
    whiteSpace: "pre-line",
    textWrap: "pretty",
    overflowWrap: "anywhere",
  },
});

export function NoteDetails({ text }: { text: string }) {
  return <div {...stylex.props(styles.text)}>{text}</div>;
}
