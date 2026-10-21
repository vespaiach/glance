import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { Season } from "@/domain/schemas";
import {
  type Clock as ClockSetting,
  formatClock,
  formatLongDate,
  formatMonthDay,
  formatWeekday,
  minutesOfDay,
} from "@/domain/time";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { Icon } from "@/ui/Icon";
import { seasonIcons } from "@/ui/seasonIcons";
import { SignInPreview } from "./SignInPreview";

type SignInHeroProps = {
  season: Season;
  time: Date;
  clock: ClockSetting;
  tz: string;
  phone: boolean;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: space.lg,
    minWidth: 0,
  },
  top: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: `${space.xs} ${space.md}`,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: 540,
    letterSpacing: "-0.4px",
  },
  now: {
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  intro: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
    minWidth: 0,
  },
  headline: {
    margin: 0,
    maxWidth: "15ch",
    fontSize: "clamp(40px, 4.4vw, 86px)",
    fontWeight: 340,
    lineHeight: 1,
    letterSpacing: "-1.72px",
    textWrap: "balance",
  },
  tagline: {
    maxWidth: 520,
    fontSize: "clamp(20px, 1.6vw, 24px)",
    fontWeight: 330,
    lineHeight: 1.35,
    letterSpacing: "-0.2px",
    textWrap: "pretty",
  },
});

export function SignInHero({ season, time, clock, tz, phone, xstyle }: SignInHeroProps) {
  return (
    <ColorBlock tone={1} padding="clamp(24px, 3.2vw, 48px)" xstyle={[styles.root, xstyle]}>
      <div {...stylex.props(styles.top)}>
        <span {...stylex.props(styles.wordmark)}>{copy.appName}</span>
        <span {...stylex.props(styles.now)}>
          <span>{heroDate(time, tz, phone)}</span>
          <span aria-hidden>·</span>
          <span>{formatClock(minutesOfDay(time, tz), clock)}</span>
          <Icon icon={seasonIcons[season]} size={20} />
        </span>
      </div>
      <div {...stylex.props(styles.intro)}>
        <p {...stylex.props(styles.headline)}>{copy.signIn.headline}</p>
        <div {...stylex.props(styles.tagline)}>{copy.signIn.tagline}</div>
      </div>
      {!phone && <SignInPreview />}
    </ColorBlock>
  );
}

function heroDate(time: Date, tz: string, phone: boolean): string {
  if (!phone) return formatLongDate(time, tz);

  return copy.signIn.shortDate(formatWeekday(time, tz), formatMonthDay(time, tz));
}
