import * as stylex from "@stylexjs/stylex";
import { Moon } from "lucide-react";
import { copy } from "@/copy";
import type { AccountSettings } from "@/domain/schemas";
import { formatClock } from "@/domain/time";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { PillTabs } from "@/ui/PillTabs";

type ScreenOptionsProps = {
  settings: AccountSettings;
  onChange: (change: Partial<AccountSettings>) => void;
  onPreviewAmbient: () => void;
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
    gap: 10,
  },
  tile: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: 20,
  },
  tileText: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
  },
  tileTitle: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
  },
  tileBody: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
  },
  button: {
    boxShadow: shadows.shadow1,
  },
});

function clockMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function ambientRange({ ambientHours, clock }: AccountSettings): string {
  const start = formatClock(clockMinutes(ambientHours.start), clock);

  return copy.settings.ambient.hours(start, formatClock(clockMinutes(ambientHours.end), clock));
}

function idleOption(timeout: AccountSettings["idleTimeout"]): IdleOption {
  return timeout === null ? "never" : (`${timeout}` as const);
}

function AmbientTile({ settings, onPreviewAmbient }: Omit<ScreenOptionsProps, "onChange">) {
  const text = copy.settings.ambient;

  return (
    <div {...stylex.props(styles.tile)}>
      <div {...stylex.props(styles.tileText)}>
        <span {...stylex.props(styles.tileTitle)}>{text.title}</span>
        <span {...stylex.props(styles.tileBody)}>{ambientRange(settings)}</span>
      </div>
      <Button variant="secondary" icon={Moon} onClick={onPreviewAmbient} xstyle={styles.button}>
        {text.preview}
      </Button>
    </div>
  );
}

export function ScreenOptions({ settings, onChange, onPreviewAmbient }: ScreenOptionsProps) {
  const text = copy.settings;

  return (
    <ColorBlock tone="soft" padding="clamp(20px, 2.4vw, 32px)" xstyle={styles.block}>
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.schedule}</Eyebrow>
        <AmbientTile settings={settings} onPreviewAmbient={onPreviewAmbient} />
      </div>
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.idle.title}</Eyebrow>
        <PillTabs
          label={text.idle.title}
          options={text.idle.options}
          value={idleOption(settings.idleTimeout)}
          onChange={(value) => onChange({ idleTimeout: IDLE_TIMEOUTS[value] })}
        />
      </div>
      <div {...stylex.props(styles.group)}>
        <Eyebrow>{text.noteExpiry.title}</Eyebrow>
        <PillTabs<ExpiryOption>
          label={text.noteExpiry.title}
          options={text.noteExpiry.options}
          value={settings.noteExpiry ?? "never"}
          onChange={(value) => onChange({ noteExpiry: value === "never" ? null : value })}
        />
      </div>
    </ColorBlock>
  );
}
