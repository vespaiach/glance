import * as stylex from "@stylexjs/stylex";
import { Flower2, Leaf, type LucideIcon, Snowflake, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import type { Season } from "@/domain/schemas";
import { type Clock as ClockSetting, formatMonth } from "@/domain/time";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Clock } from "@/ui/Clock";
import { ColorBlock } from "@/ui/ColorBlock";
import { Icon } from "@/ui/Icon";

type TodayHeroProps = {
  season: Season;
  time: Date;
  clock: ClockSetting;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

const SEASON_ICONS: Record<Season, LucideIcon> = {
  spring: Flower2,
  summer: Sun,
  fall: Leaf,
  winter: Snowflake,
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: space.xl,
    minWidth: 0,
  },
  top: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    fontFamily: type.fontMono,
    fontSize: type.eyebrowSize,
    letterSpacing: type.eyebrowLs,
    textTransform: "uppercase",
  },
});

export function TodayHero({ season, time, clock, children, xstyle }: TodayHeroProps) {
  return (
    <ColorBlock tone={1} padding="clamp(24px, 2.6vw, 40px)" xstyle={[styles.root, xstyle]}>
      <div {...stylex.props(styles.top)}>
        <span {...stylex.props(styles.label)}>
          <Icon icon={SEASON_ICONS[season]} size={20} />
          {copy.today.seasonMonth(copy.season[season], formatMonth(time))}
        </span>
        <Clock time={time} hour12={clock === "12h"} />
      </div>
      {children}
      <span {...stylex.props(styles.label)}>{copy.appName}</span>
    </ColorBlock>
  );
}
