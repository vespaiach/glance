import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { CalendarEvent, WeatherLocation } from "@/domain/schemas";
import { type Clock, clockAt } from "@/domain/time";
import { timeZoneName, type ZoneChange, zoneChange } from "@/domain/zoneName";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { placeLabel } from "../location";

export type ZoneExample = Pick<CalendarEvent, "title" | "startAt">;

type ZoneConfirmProps = {
  place: WeatherLocation;
  from: string;
  now: Date;
  clock: Clock;
  example?: ZoneExample | undefined;
  onConfirm: () => void;
  onKeep: () => void;
};

const styles = stylex.create({
  block: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
  },
  body: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: space.sm,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    borderRadius: radii.md,
    padding: space.md,
  },
  tileLabel: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  tileTime: {
    fontSize: "clamp(26px, 2.4vw, 36px)",
    fontWeight: 300,
    letterSpacing: "-1px",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.1,
  },
  example: {
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
  },
});

export function ZoneConfirm({
  place,
  from,
  now,
  clock,
  example,
  onConfirm,
  onKeep,
}: ZoneConfirmProps) {
  const text = copy.location.confirm;

  const to = place.timeZone ?? from;

  const [fromName, toName] = [timeZoneName(from), timeZoneName(to)];

  const change = zoneChange(from, to, now);

  const at = (iso: string, zone: string) => clockAt(iso, clock, zone);

  const showsExample = example && change.kind === "shift";

  return (
    <ColorBlock
      tone={4}
      padding="clamp(20px, 2.4vw, 32px)"
      role="group"
      aria-label={text.title(toName)}
      xstyle={styles.block}
    >
      <div {...stylex.props(styles.heading)}>
        <Eyebrow>{text.eyebrow}</Eyebrow>
        <span {...stylex.props(styles.title)}>{text.title(toName)}</span>
        <span {...stylex.props(styles.body)}>{changeBody(change, placeLabel(place), toName)}</span>
      </div>
      <div {...stylex.props(styles.tiles)}>
        <Tile label={text.before(fromName)} time={at(now.toISOString(), from)} />
        <Tile label={text.after(toName)} time={at(now.toISOString(), to)} />
      </div>
      {showsExample && (
        <span {...stylex.props(styles.example)}>
          {text.example(example.title, at(example.startAt, from), at(example.startAt, to))}
        </span>
      )}
      <div {...stylex.props(styles.actions)}>
        <Button onClick={onConfirm}>{text.switch(toName)}</Button>
        <Button variant="secondary" onClick={onKeep}>
          {text.keep(fromName)}
        </Button>
      </div>
    </ColorBlock>
  );
}

function changeBody(change: ZoneChange, place: string, zone: string): string {
  const text = copy.location.confirm;

  if (change.kind === "same-now") return text.sameNow(place, zone);

  return text.moves(place, zone, text.hours(change.hours), change.direction);
}

function Tile({ label, time }: { label: string; time: string }) {
  return (
    <div {...stylex.props(styles.tile)}>
      <span {...stylex.props(styles.tileLabel)}>{label}</span>
      <span {...stylex.props(styles.tileTime)}>{time}</span>
    </div>
  );
}
