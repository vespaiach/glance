import * as stylex from "@stylexjs/stylex";
import type { CalendarEvent, Tone } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { press } from "./press";

type AllDayTileProps = {
  label: string;
  title: string;
  location?: string;
  dot: Tone;
  onClick: () => void;
};

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  tile: {
    borderWidth: 0,
    font: "inherit",
    cursor: "pointer",
    textAlign: "start",
    minHeight: 56,
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: space.md,
    paddingBlock: 12,
    paddingInline: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  label: {
    flexShrink: 0,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  dot: {
    flexShrink: 0,
    width: 12,
    height: 12,
    borderRadius: radii.full,
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  },
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
  accent: { backgroundColor: season.accent },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 540,
    letterSpacing: "-0.2px",
    lineHeight: 1.25,
    textWrap: "pretty",
  },
  location: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
  },
});

type AllDayTilesProps = {
  events: readonly CalendarEvent[];
  label: string;
  onOpenEvent: (id: string) => void;
};

export function AllDayTile({ label, title, location, dot, onClick }: AllDayTileProps) {
  return (
    <button type="button" onClick={onClick} {...stylex.props(styles.tile, press.scale)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <span aria-hidden="true" {...stylex.props(styles.dot, dotStyle(dot))} />
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.title)}>{title}</span>
        {location && <span {...stylex.props(styles.location)}>{location}</span>}
      </span>
    </button>
  );
}

export function AllDayTiles({ events, label, onOpenEvent }: AllDayTilesProps) {
  if (events.length === 0) return null;

  return (
    <div {...stylex.props(styles.list)}>
      {events.map((event) => (
        <AllDayTile
          key={event.id}
          label={label}
          title={event.title}
          location={event.location}
          dot={event.tone}
          onClick={() => onOpenEvent(event.id)}
        />
      ))}
    </div>
  );
}

function dotStyle(dot: Tone) {
  return typeof dot === "number" ? styles[`tone${dot}`] : styles[dot];
}
