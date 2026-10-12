import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { Season } from "@/domain/schemas";
import { type Clock as ClockSetting, formatMonth } from "@/domain/time";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Clock } from "@/ui/Clock";
import { ColorBlock } from "@/ui/ColorBlock";
import { Icon } from "@/ui/Icon";
import { seasonIcons } from "@/ui/seasonIcons";

type SignInHeroProps = {
  season: Season;
  time: Date;
  clock: ClockSetting;
  tz: string;
  xstyle?: stylex.StyleXStyles;
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
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: 540,
    letterSpacing: "-0.4px",
  },
  season: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  tagline: {
    maxWidth: 520,
    fontSize: "clamp(22px, 2vw, 28px)",
    fontWeight: 340,
    lineHeight: 1.3,
    letterSpacing: "-0.3px",
    textWrap: "pretty",
  },
});

export function SignInHero({ season, time, clock, tz, xstyle }: SignInHeroProps) {
  return (
    <ColorBlock tone={1} padding="clamp(24px, 3.2vw, 48px)" xstyle={[styles.root, xstyle]}>
      <div {...stylex.props(styles.top)}>
        <span {...stylex.props(styles.wordmark)}>{copy.appName}</span>
        <span {...stylex.props(styles.season)}>
          <Icon icon={seasonIcons[season]} size={20} />
          {copy.today.seasonMonth(copy.season[season], formatMonth(time, tz))}
        </span>
      </div>
      <Clock time={time} tz={tz} hour12={clock === "12h"} />
      <div {...stylex.props(styles.tagline)}>{copy.signIn.tagline}</div>
    </ColorBlock>
  );
}
