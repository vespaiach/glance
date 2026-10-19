import * as stylex from "@stylexjs/stylex";
import { eventColor, whoLabel } from "@/domain/members";
import type { CalendarEvent, Member, MemberColor } from "@/domain/schemas";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { PersonDot } from "./PersonDot";
import { press } from "./press";

type AllDayTileProps = {
  label: string;
  title: string;
  who: string;
  location?: string;
  dot: MemberColor | "soft";
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
  detail: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
  },
});

type AllDayTilesProps = {
  events: readonly CalendarEvent[];
  members: readonly Member[];
  label: string;
  everyoneLabel: string;
  onOpenEvent: (id: string) => void;
};

export function AllDayTile({ label, title, who, location, dot, onClick }: AllDayTileProps) {
  return (
    <button type="button" onClick={onClick} {...stylex.props(styles.tile, press.scale)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <PersonDot color={dot} />
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.title)}>{title}</span>
        <span {...stylex.props(styles.detail)}>{location ? `${who} · ${location}` : who}</span>
      </span>
    </button>
  );
}

export function AllDayTiles({
  events,
  members,
  label,
  everyoneLabel,
  onOpenEvent,
}: AllDayTilesProps) {
  if (events.length === 0) return null;

  return (
    <div {...stylex.props(styles.list)}>
      {events.map((event) => (
        <AllDayTile
          key={event.id}
          label={label}
          title={event.title}
          who={whoLabel(event, members, everyoneLabel)}
          location={event.location}
          dot={eventColor(event, members)}
          onClick={() => onOpenEvent(event.id)}
        />
      ))}
    </div>
  );
}
