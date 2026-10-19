import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import type { Season } from "@/domain/schemas";
import { type Clock as ClockSetting, formatLongDate } from "@/domain/time";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Clock } from "@/ui/Clock";
import { ColorBlock } from "@/ui/ColorBlock";
import { Icon } from "@/ui/Icon";
import { seasonIcons } from "@/ui/seasonIcons";

type TodayHeroProps = {
  season: Season;
  time: Date;
  clock: ClockSetting;
  tz: string;
  weather: ReactNode;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

const nowPanelType = stylex.createTheme(type, {
  clockSize: "clamp(56px, 27cqi, 200px)",
});

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 32,
    minWidth: 0,
    containerType: "inline-size",
  },
  top: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
  },
  date: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: type.fontMono,
    fontSize: type.eyebrowSize,
    letterSpacing: type.eyebrowLs,
    lineHeight: 1.3,
    textTransform: "uppercase",
  },
});

export function TodayHero({ season, time, clock, tz, weather, children, xstyle }: TodayHeroProps) {
  return (
    <ColorBlock tone={1} padding="clamp(24px, 2.6vw, 40px)" xstyle={[styles.root, xstyle]}>
      <div {...stylex.props(nowPanelType, styles.top)}>
        <span {...stylex.props(styles.date)}>
          <span>{formatLongDate(time, tz)}</span>
          <Icon icon={seasonIcons[season]} size={18} />
        </span>
        <Clock time={time} tz={tz} hour12={clock === "12h"} showDate={false} />
      </div>
      {weather}
      {children}
    </ColorBlock>
  );
}
