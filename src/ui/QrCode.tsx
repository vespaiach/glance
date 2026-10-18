import * as stylex from "@stylexjs/stylex";
import { encode } from "uqr";
import { colors, radii } from "@/theme/tokens.stylex";

type QrCodeProps = {
  value?: string;
  label: string;
};

const CODE_PX = 150;

const styles = stylex.create({
  frame: {
    flexShrink: 0,
    display: "flex",
    padding: 12,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
  },
  code: {
    width: CODE_PX,
    height: CODE_PX,
  },
  dark: {
    fill: colors.textPrimary,
  },
});

export function QrCode({ value, label }: QrCodeProps) {
  const code = value === undefined ? undefined : encode(value, { ecc: "M", border: 1 });

  return (
    <span {...stylex.props(styles.frame)}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${code?.size ?? 1} ${code?.size ?? 1}`}
        shapeRendering="crispEdges"
        {...stylex.props(styles.code)}
      >
        {code && <path d={modulesPath(code.data)} {...stylex.props(styles.dark)} />}
      </svg>
    </span>
  );
}

function modulesPath(modules: readonly (readonly boolean[])[]): string {
  return modules
    .flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : [])))
    .join("");
}
