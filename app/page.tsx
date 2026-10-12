import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  page: {
    minHeight: "100dvh",
    backgroundColor: "#f4efe6",
  },
});

export default function HomePage() {
  return <main {...stylex.props(styles.page)} />;
}
