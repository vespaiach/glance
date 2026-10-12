import * as stylex from "@stylexjs/stylex";
import { radii, space } from "@/theme/tokens.stylex";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";

type ViewPlaceholderProps = {
  label: string;
  layout: stylex.StyleXStyles;
  zones: Record<string, stylex.StyleXStyles>;
};

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
    alignContent: "start",
  },
  zone: {
    minHeight: 240,
    borderRadius: radii.lg,
  },
});

export function ViewPlaceholder({ label, layout, zones }: ViewPlaceholderProps) {
  return (
    <Skeleton label={label} xstyle={[styles.grid, layout]}>
      {Object.entries(zones).map(([name, zone]) => (
        <SkeletonBlock key={name} height="auto" xstyle={[styles.zone, zone]} />
      ))}
    </Skeleton>
  );
}
