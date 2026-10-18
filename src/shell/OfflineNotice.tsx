import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { savedTimeShown } from "@/domain/offline";
import { type Clock, clockAt } from "@/domain/time";
import { motion, sizes } from "@/theme/tokens.stylex";
import { OfflinePill } from "@/ui/OfflinePill";
import { useNetwork } from "./providers/network";
import { useAccountSettings } from "./providers/settings";
import { useTimeZone } from "./providers/timeZone";

type OfflineNoticeProps = {
  breakpoint: Breakpoint;
  inset: number;
  onWeather: boolean;
};

const styles = stylex.create({
  pill: {
    position: "fixed",
    left: sizes.kioskGutter,
    bottom: 24,
    zIndex: 6,
    transitionProperty: "margin-left",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeSlide,
  },
  besideSidebar: (inset: number) => ({ marginLeft: inset }),
});

export function OfflineNotice({ breakpoint, inset, onWeather }: OfflineNoticeProps) {
  const { showOfflinePill, savedAt } = useNetwork();

  const { clock } = useAccountSettings();

  const tz = useTimeZone();

  if (!showOfflinePill) return null;

  const showSaved = savedAt !== undefined && savedTimeShown(breakpoint, onWeather);

  return (
    <OfflinePill
      label={copy.offline.label}
      {...(showSaved && { meta: savedLabel(savedAt, clock, tz) })}
      xstyle={[styles.pill, styles.besideSidebar(inset)]}
    />
  );
}

function savedLabel(savedAt: string, clock: Clock, tz: string): string {
  return copy.offline.saved(clockAt(savedAt, clock, tz));
}
