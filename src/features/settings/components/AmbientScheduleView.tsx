"use client";

import * as stylex from "@stylexjs/stylex";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { ambientLength, ambientMinutes, ambientSegments, ambientTime } from "@/domain/idle";
import type { AccountSettings, Ambient, AmbientSet } from "@/domain/schemas";
import { type Clock, formatClock, formatHour } from "@/domain/time";
import { season } from "@/theme/seasons.stylex";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { BackLink } from "@/ui/BackLink";
import { Button } from "@/ui/Button";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { PillTabs } from "@/ui/PillTabs";
import { TimeField } from "@/ui/TimeField";
import { TimePicker } from "@/ui/TimePicker";
import { settingsLayout } from "../layout";

type SetKey = "all" | "wknd";

type Edge = "s" | "e";

export type AmbientPick = `${SetKey}.${Edge}`;

type AmbientScheduleViewProps = {
  ambient: Ambient;
  clock: Clock;
  idleTimeout: AccountSettings["idleTimeout"];
  breakpoint: Breakpoint;
  initialPick?: AmbientPick | undefined;
  onChange: (ambient: Ambient) => void;
  onBack: () => void;
  onPreview: () => void;
};

type ShownSet = { key: SetKey; title: string; heading: boolean };

const text = copy.ambientSchedule;

const EDGES = { s: "start", e: "end" } as const;

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
    alignItems: "start",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: "clamp(20px, 2.6vw, 40px)",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: type.displayXlWeight,
    letterSpacing: type.displayXlLs,
    lineHeight: type.displayXlLh,
  },
  intro: {
    maxWidth: 640,
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  tabs: {
    maxWidth: "100%",
    display: "flex",
  },
  set: {
    borderWidth: 0,
    padding: 0,
    margin: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: space.md,
  },
  off: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: 20,
  },
  icon: {
    display: "flex",
    flex: "none",
  },
  body: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  side: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
  },
  strips: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  strip: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  stripHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: `${space.xxs} ${space.sm}`,
  },
  stripTitle: {
    fontSize: 20,
    fontWeight: 540,
    letterSpacing: "-0.2px",
  },
  stripRange: {
    fontSize: 17,
    fontWeight: 330,
    fontVariantNumeric: "tabular-nums",
  },
  bar: {
    position: "relative",
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    overflow: "hidden",
  },
  segment: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: season.deep,
  },
  place: (left: number, width: number) => ({ left: `${left}%`, width: `${width}%` }),
  ticks: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  wakeLine: {
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  preview: {
    alignSelf: "flex-start",
    boxShadow: shadows.shadow1,
  },
});

type SetFieldsProps = {
  shown: ShownSet;
  set: AmbientSet;
  clock: Clock;
  pick: AmbientPick | null;
  compact: boolean;
  onPick: (pick: AmbientPick | null) => void;
  onChange: (set: AmbientSet) => void;
};

type OverDayProps = Pick<
  AmbientScheduleViewProps,
  "ambient" | "clock" | "idleTimeout" | "onPreview"
>;

export function AmbientScheduleView({
  ambient,
  clock,
  idleTimeout,
  breakpoint,
  initialPick,
  onChange,
  onBack,
  onPreview,
}: AmbientScheduleViewProps) {
  const [pick, setPick] = useState<AmbientPick | null>(initialPick ?? null);

  const changeMode = (mode: Ambient["mode"]) => {
    setPick(null);
    onChange({ ...ambient, mode });
  };

  return (
    <div {...stylex.props(styles.grid, settingsLayout(breakpoint))}>
      <BackLink label={text.back} onBack={onBack} />
      <div {...stylex.props(styles.panel)}>
        <Header />
        <div {...stylex.props(styles.group)}>
          <Eyebrow>{text.schedule}</Eyebrow>
          <div {...stylex.props(styles.tabs)}>
            <PillTabs
              label={text.schedule}
              options={text.modes}
              value={ambient.mode}
              onChange={changeMode}
              size="lg"
            />
          </div>
        </div>
        {shownSets(ambient.mode).map((shown) => (
          <SetFields
            key={shown.key}
            shown={shown}
            set={ambient[shown.key]}
            clock={clock}
            pick={pick}
            compact={breakpoint === "small"}
            onPick={setPick}
            onChange={(set) => onChange({ ...ambient, [shown.key]: set })}
          />
        ))}
        {ambient.mode === "off" && <StaysBright />}
      </div>
      <OverDay ambient={ambient} clock={clock} idleTimeout={idleTimeout} onPreview={onPreview} />
    </div>
  );
}

function shownSets(mode: Ambient["mode"]): ShownSet[] {
  if (mode === "off") return [];

  if (mode === "same") return [{ key: "all", title: text.sets.every, heading: false }];

  return [
    { key: "all", title: text.sets.all, heading: true },
    { key: "wknd", title: text.sets.wknd, heading: true },
  ];
}

function rangeText(set: AmbientSet, clock: Clock): string {
  if (ambientLength(set) === 0) return text.notSet;

  const at = (time: string) => formatClock(ambientMinutes(time), clock);

  return text.range(at(set.start), at(set.end));
}

function barTicks(clock: Clock): [string, string][] {
  return [
    ["noon", text.noon],
    ["evening", formatHour(18 * 60, clock)],
    ["midnight", text.midnight],
    ["morning", formatHour(6 * 60, clock)],
    ["next-noon", text.noon],
  ];
}

function Header() {
  return (
    <div {...stylex.props(styles.header)}>
      <h2 {...stylex.props(styles.title)}>{text.title}</h2>
      <span {...stylex.props(styles.intro)}>{text.intro}</span>
    </div>
  );
}

function SetFields({ shown, set, clock, pick, compact, onPick, onChange }: SetFieldsProps) {
  const length = ambientLength(set);

  const open = pick?.startsWith(`${shown.key}.`) ? (pick.slice(-1) as Edge) : null;

  const toggle = (edge: Edge) => onPick(open === edge ? null : `${shown.key}.${edge}`);

  const fieldLabels = { noEnd: "", change: copy.events.time.change };

  return (
    <fieldset aria-label={shown.title} {...stylex.props(styles.set)}>
      {shown.heading && <Eyebrow>{shown.title}</Eyebrow>}
      <div {...stylex.props(styles.fields)}>
        <TimeField
          label={text.dims}
          value={ambientMinutes(set.start)}
          clock={clock}
          open={open === "s"}
          labels={fieldLabels}
          compact={compact}
          onToggle={() => toggle("s")}
        />
        <TimeField
          label={text.wakes}
          value={ambientMinutes(set.end)}
          clock={clock}
          {...(length > 0 ? { length } : { error: text.sameTime })}
          open={open === "e"}
          labels={fieldLabels}
          compact={compact}
          onToggle={() => toggle("e")}
        />
      </div>
      {open && (
        <TimePicker
          label={open === "s" ? text.dims : text.wakes}
          groupLabel={open === "s" ? text.dimGroup : text.wakeGroup}
          value={ambientMinutes(set[EDGES[open]])}
          clock={clock}
          labels={copy.events.time}
          minuteStep={15}
          doneVariant="primary"
          compact={compact}
          onChange={(minutes) => onChange({ ...set, [EDGES[open]]: ambientTime(minutes) })}
          onDone={() => onPick(null)}
        />
      )}
    </fieldset>
  );
}

function StaysBright() {
  return (
    <div {...stylex.props(styles.off)}>
      <span {...stylex.props(styles.icon)}>
        <Icon icon={Sun} size={28} strokeWidth={1.5} />
      </span>
      <span {...stylex.props(styles.body)}>{text.staysBright}</span>
    </div>
  );
}

function Strip({ title, set, clock }: { title: string; set: AmbientSet; clock: Clock }) {
  const range = rangeText(set, clock);

  return (
    <div {...stylex.props(styles.strip)}>
      <div {...stylex.props(styles.stripHeader)}>
        <span {...stylex.props(styles.stripTitle)}>{title}</span>
        <span {...stylex.props(styles.stripRange)}>{range}</span>
      </div>
      <div role="img" aria-label={text.bar(title, range)} {...stylex.props(styles.bar)}>
        {ambientSegments(set).map(({ left, width }) => (
          <div key={left} {...stylex.props(styles.segment, styles.place(left, width))} />
        ))}
      </div>
      <div aria-hidden {...stylex.props(styles.ticks)}>
        {barTicks(clock).map(([key, tick]) => (
          <span key={key}>{tick}</span>
        ))}
      </div>
    </div>
  );
}

function OverDay({ ambient, clock, idleTimeout, onPreview }: OverDayProps) {
  const sets = shownSets(ambient.mode);

  const off = ambient.mode === "off";

  return (
    <ColorBlock tone="soft" padding="clamp(20px, 2.4vw, 32px)" xstyle={styles.side}>
      <Eyebrow>{text.over24}</Eyebrow>
      {off ? (
        <span {...stylex.props(styles.body)}>{text.noHours}</span>
      ) : (
        <div {...stylex.props(styles.strips)}>
          {sets.map((shown) => (
            <Strip key={shown.key} title={shown.title} set={ambient[shown.key]} clock={clock} />
          ))}
        </div>
      )}
      <span {...stylex.props(styles.wakeLine)}>
        {off ? text.wakeLineOff : text.wakeLine(idleTimeout)}
      </span>
      <Button variant="secondary" icon={Moon} onClick={onPreview} xstyle={styles.preview}>
        {text.preview}
      </Button>
    </ColorBlock>
  );
}
