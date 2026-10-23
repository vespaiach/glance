import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Season } from "@/domain/schemas";
import { type Clock as ClockSetting, formatLongDate } from "@/domain/time";
import { colors, sizes, space } from "@/theme/tokens.stylex";
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
  breakpoint: Breakpoint;
  weather: ReactNode;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

const nowPanelType = stylex.createTheme(type, {
  clockSize: "clamp(56px, 31cqi, 200px)",
});

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    minHeight: 0,
    overflow: "clip",
    containerType: "inline-size",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    minWidth: 0,
  },
  sticky: {
    position: "sticky",
    top: sizes.kioskGutter,
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
  group: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    paddingTop: 24,
    boxShadow: `inset 0 1px 0 ${colors.surfaceCanvas}`,
  },
  smallGroup: {
    paddingTop: space.md,
  },
});

export function TodayHero({
  season,
  time,
  clock,
  tz,
  breakpoint,
  weather,
  children,
  xstyle,
}: TodayHeroProps) {
  const small = breakpoint === "small";

  return (
    <ColorBlock tone={1} padding="clamp(24px, 2.6vw, 40px)" xstyle={[styles.root, xstyle]}>
      <div {...stylex.props(styles.content, breakpoint === "normal" && styles.sticky)}>
        <div {...stylex.props(nowPanelType, styles.top)}>
          <span {...stylex.props(styles.date)}>
            <span>{formatLongDate(time, tz)}</span>
            <Icon icon={seasonIcons[season]} size={18} />
          </span>
          {!small && <Clock time={time} tz={tz} hour12={clock === "12h"} showDate={false} />}
        </div>
        <div {...stylex.props(styles.group, small && styles.smallGroup)}>{weather}</div>
        <div {...stylex.props(styles.group)}>{children}</div>
      </div>
    </ColorBlock>
  );
}
