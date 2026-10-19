import * as stylex from "@stylexjs/stylex";
import { type } from "@/theme/type.stylex";

type NoteDetailsProps = {
  text: string;
  time: string;
};

const styles = stylex.create({
  root: {
    minHeight: 200,
    paddingBlock: "8px 4px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 24,
  },
  text: {
    fontSize: "clamp(26px, 3vw, 36px)",
    fontWeight: 340,
    letterSpacing: "-0.5px",
    lineHeight: 1.25,
    whiteSpace: "pre-line",
    textWrap: "pretty",
    overflowWrap: "anywhere",
  },
  time: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
});

export function NoteDetails({ text, time }: NoteDetailsProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.text)}>{text}</div>
      <span {...stylex.props(styles.time)}>{time}</span>
    </div>
  );
}
