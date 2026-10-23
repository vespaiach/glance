import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  text: {
    marginTop: -12,
    fontSize: "clamp(32px, 3.4vw, 48px)",
    fontWeight: 400,
    letterSpacing: "-0.6px",
    lineHeight: 1.2,
    whiteSpace: "pre-line",
    textWrap: "pretty",
    overflowWrap: "anywhere",
  },
});

export function NoteDetails({ text }: { text: string }) {
  return <div {...stylex.props(styles.text)}>{text}</div>;
}
