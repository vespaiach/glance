import * as stylex from "@stylexjs/stylex";
import { ChevronRight } from "lucide-react";
import { copy } from "@/copy";
import { ambientSummary } from "@/domain/idle";
import type { AccountSettings } from "@/domain/schemas";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { PillTabs } from "@/ui/PillTabs";
import { press } from "@/ui/press";

type ScreenOptionsProps = {
  settings: AccountSettings;
  onChange: (change: Partial<AccountSettings>) => void;
  onOpenAmbient: () => void;
};

type IdleOption = (typeof copy.settings.idle.options)[number]["value"];

type ExpiryOption = (typeof copy.settings.noteExpiry.options)[number]["value"];

const IDLE_TIMEOUTS: Record<IdleOption, AccountSettings["idleTimeout"]> = {
  "60": 60,
  "180": 180,
  "300": 300,
  never: null,
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
  },
  tileBody: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
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
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.idle.title}</Eyebrow>
        <PillTabs
          label={text.idle.title}
          options={text.idle.options}
          value={idleOption(settings.idleTimeout)}
          onChange={(value) => onChange({ idleTimeout: IDLE_TIMEOUTS[value] })}
          size="lg"
        />
      </div>
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.noteExpiry.title}</Eyebrow>
        <PillTabs<ExpiryOption>
          label={text.noteExpiry.title}
          options={text.noteExpiry.options}
          value={settings.noteExpiry ?? "never"}
          onChange={(value) => onChange({ noteExpiry: value === "never" ? null : value })}
          size="lg"
        />
      </div>
    </ColorBlock>
  );
}

function idleOption(timeout: AccountSettings["idleTimeout"]): IdleOption {
  return timeout === null ? "never" : (`${timeout}` as const);
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
