import * as stylex from "@stylexjs/stylex";
import { TriangleAlert } from "lucide-react";
import { copy } from "@/copy";
import { type StorageMeter as Meter, type PhotoUsage, storageMeter } from "@/domain/storage";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";

type StorageMeterProps = { usage: PhotoUsage };

const text = copy.settings.account.storage;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    padding: "16px 20px",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
  numbers: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: `${space.xxs} ${space.md}`,
  },
  left: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    fontVariantNumeric: "tabular-nums",
  },
  used: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    fontVariantNumeric: "tabular-nums",
  },
  track: {
    height: 12,
    overflow: "hidden",
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.black,
    transitionProperty: "width",
    transitionDuration: motion.durBase,
    transitionTimingFunction: "ease",
  },
  fillDanger: {
    backgroundColor: colors.danger,
  },
  fillWidth: (fraction: number) => ({ width: `${(fraction * 100).toFixed(1)}%` }),
  note: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.xs,
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  warnIcon: {
    display: "flex",
    flexShrink: 0,
    paddingTop: 1,
    color: colors.danger,
  },
});

export function StorageMeter({ usage }: StorageMeterProps) {
  const meter = storageMeter(usage.used, usage.limit);

  const used = text.used(meter.used, meter.limit);

  const warn = meter.level !== "ok";

  return (
    <div {...stylex.props(styles.root)}>
      <Eyebrow>{text.title}</Eyebrow>
      <div {...stylex.props(styles.tile)}>
        <div {...stylex.props(styles.numbers)}>
          <span {...stylex.props(styles.left)}>{leftText(meter)}</span>
          <span {...stylex.props(styles.used)}>{used}</span>
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a native meter can't take the pill track, hairline ring and animated fill */}
        <div
          role="meter"
          aria-label={text.meter}
          aria-valuemin={0}
          aria-valuemax={meter.limit}
          aria-valuenow={meter.used}
          aria-valuetext={used}
          {...stylex.props(styles.track)}
        >
          <div
            {...stylex.props(
              styles.fill,
              warn && styles.fillDanger,
              styles.fillWidth(meter.fraction),
            )}
          />
        </div>
        <span {...stylex.props(styles.note)}>
          {warn && (
            <span {...stylex.props(styles.warnIcon)}>
              <Icon icon={TriangleAlert} size={18} />
            </span>
          )}
          {noteText(meter)}
        </span>
      </div>
    </div>
  );
}

function leftText(meter: Meter): string {
  return meter.level === "full" ? text.noneLeft : text.left(meter.left, meter.unit);
}

function noteText(meter: Meter): string {
  if (meter.level === "full") return text.full;

  return meter.level === "almost" ? text.almost : text.ok;
}
