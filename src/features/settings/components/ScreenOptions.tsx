import * as stylex from "@stylexjs/stylex";
import { ChevronRight } from "lucide-react";
import { copy } from "@/copy";
import { ambientSummary } from "@/domain/idle";
import { type AccountSettings, IDLE_MINUTES, NOTE_DAYS } from "@/domain/schemas";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { SwitchSliderTile } from "./SwitchSliderTile";

type ScreenOptionsProps = {
  settings: AccountSettings;
  onChange: (change: Partial<AccountSettings>) => void;
  onOpenAmbient: () => void;
};

const styles = stylex.create({
  block: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  tile: {
    width: "100%",
    minHeight: 72,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: 20,
    boxSizing: "border-box",
    fontFamily: type.fontSans,
    color: colors.textPrimary,
    textAlign: "start",
    cursor: "pointer",
  },
  tileText: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    minWidth: 0,
  },
  tileTitle: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
    lineHeight: 1.2,
  },
  tileBody: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
});

export function ScreenOptions({ settings, onChange, onOpenAmbient }: ScreenOptionsProps) {
  const text = copy.settings;

  return (
    <ColorBlock tone="soft" padding="clamp(20px, 2.4vw, 32px)" xstyle={styles.block}>
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.schedule}</Eyebrow>
        <AmbientTile settings={settings} onOpenAmbient={onOpenAmbient} />
      </div>
      <SwitchSliderTile
        text={text.idle}
        range={IDLE_MINUTES}
        on={settings.idleTimeout.on}
        value={settings.idleTimeout.minutes}
        onChange={(on, minutes) => onChange({ idleTimeout: { on, minutes } })}
      />
      <SwitchSliderTile
        text={text.noteExpiry}
        range={NOTE_DAYS}
        on={settings.noteExpiry.on}
        value={settings.noteExpiry.days}
        onChange={(on, days) => onChange({ noteExpiry: { on, days } })}
      />
    </ColorBlock>
  );
}

function AmbientTile({ settings, onOpenAmbient }: Omit<ScreenOptionsProps, "onChange">) {
  const text = copy.settings.ambient;

  return (
    <button type="button" onClick={onOpenAmbient} {...stylex.props(styles.tile, press.scale)}>
      <span {...stylex.props(styles.tileText)}>
        <span {...stylex.props(styles.tileTitle)}>{text.title}</span>
        <span {...stylex.props(styles.tileBody)}>
          {text.summary(ambientSummary(settings.ambient, settings.clock))}
        </span>
      </span>
      <Icon icon={ChevronRight} size={22} />
    </button>
  );
}
