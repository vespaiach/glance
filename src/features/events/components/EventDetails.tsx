import * as stylex from "@stylexjs/stylex";
import { FileText, type LucideIcon, MapPin, Users } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import type { DetailsStatus } from "@/domain/eventStatus";
import type { Tag } from "@/domain/schemas";
import { eventColor } from "@/domain/tags";
import { type Clock, formatLength, rangeParts, type TimeParts } from "@/domain/time";
import { colors, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { Icon } from "@/ui/Icon";
import { PersonDot } from "@/ui/PersonDot";
import type { EventDraft } from "../eventSheet";

type EventDetailsProps = {
  draft: EventDraft;
  tags: readonly Tag[];
  clock: Clock;
  status: DetailsStatus;
};

type RowProps = {
  icon: LucideIcon;
  label: string;
  first: boolean;
  children: ReactNode;
};

type WhoChip = { key: string; name: string; color?: Tag["color"] };

const words = copy.events.details;

const sheet = copy.events.sheet;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 8,
  },
  blockTop: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minHeight: 32,
  },
  mono: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
  pill: {
    minHeight: 32,
    display: "inline-flex",
    alignItems: "center",
    paddingInline: 14,
    borderRadius: radii.full,
    fontSize: 15,
    fontWeight: 480,
  },
  now: {
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
  },
  ended: {
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
  },
  time: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
  },
  numerals: {
    fontSize: "clamp(32px, 4vw, 44px)",
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.05,
    fontVariantNumeric: "tabular-nums",
  },
  meridiem: {
    fontFamily: type.fontMono,
    fontSize: 18,
    letterSpacing: "0.5px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "24px minmax(0, 1fr)",
    gap: 16,
    alignItems: "start",
    paddingBlock: 16,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairlineSoft,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  rowIcon: {
    display: "flex",
    paddingTop: 2,
  },
  rowBody: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  text: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
    lineHeight: 1.35,
    textWrap: "pretty",
    whiteSpace: "pre-line",
    overflowWrap: "anywhere",
  },
  chips: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingInline: 16,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    fontSize: 16,
    fontWeight: 480,
  },
});

export function EventDetails({ draft, tags, clock, status }: EventDetailsProps) {
  const chips = whoChips(draft, tags);

  const location = draft.location.trim();

  const notes = draft.notes.trim();

  const rows = [
    chips.length > 0 && { icon: Users, label: sheet.who, body: <WhoChips chips={chips} /> },
    location !== "" && { icon: MapPin, label: sheet.where, body: <Text>{location}</Text> },
    notes !== "" && { icon: FileText, label: sheet.notes, body: <Text>{notes}</Text> },
  ].filter((row) => row !== false);

  return (
    <div {...stylex.props(styles.root)}>
      <TimeBlock draft={draft} tags={tags} clock={clock} status={status} />
      {rows.map((row, index) => (
        <Row key={row.label} icon={row.icon} label={row.label} first={index === 0}>
          {row.body}
        </Row>
      ))}
    </div>
  );
}

function TimeBlock({ draft, tags, clock, status }: EventDetailsProps) {
  const { time, meridiem } = blockTime(draft, clock);

  return (
    <ColorBlock tone={eventColor(draft, tags)} radius="24px" padding="24px" xstyle={styles.block}>
      <div {...stylex.props(styles.blockTop)}>
        <span {...stylex.props(styles.mono)}>{lengthLabel(draft)}</span>
        {status && <StatusPill status={status} />}
      </div>
      <div {...stylex.props(styles.time)}>
        <span {...stylex.props(styles.numerals)}>{time}</span>
        {meridiem && <span {...stylex.props(styles.meridiem)}>{meridiem}</span>}
      </div>
    </ColorBlock>
  );
}

function StatusPill({ status }: { status: NonNullable<DetailsStatus> }) {
  return (
    <span {...stylex.props(styles.pill, styles[status])}>
      {status === "now" ? words.happeningNow : words.ended}
    </span>
  );
}

function Row({ icon, label, first, children }: RowProps) {
  return (
    <div {...stylex.props(styles.row, first && styles.firstRow)}>
      <span {...stylex.props(styles.rowIcon)}>
        <Icon icon={icon} />
      </span>
      <div {...stylex.props(styles.rowBody)}>
        <span {...stylex.props(styles.mono)}>{label}</span>
        {children}
      </div>
    </div>
  );
}

function Text({ children }: { children: string }) {
  return <span {...stylex.props(styles.text)}>{children}</span>;
}

function WhoChips({ chips }: { chips: readonly WhoChip[] }) {
  return (
    <ul aria-label={sheet.who} {...stylex.props(styles.chips)}>
      {chips.map((chip) => (
        <li key={chip.key} {...stylex.props(styles.chip)}>
          {chip.color && <PersonDot color={chip.color} />}
          {chip.name}
        </li>
      ))}
    </ul>
  );
}

function whoChips(draft: EventDraft, tags: readonly Tag[]): WhoChip[] {
  if (draft.everyone) return [{ key: "everyone", name: copy.events.everyone }];

  return tags
    .filter((tag) => draft.tagIds.includes(tag.id))
    .map((tag) => ({ key: tag.id, name: tag.name, color: tag.color }));
}

function blockTime(draft: EventDraft, clock: Clock): TimeParts {
  if (draft.allDay) return { time: copy.events.allDay };

  return rangeParts(draft.start, draft.end, clock);
}

function lengthLabel(draft: EventDraft): string {
  if (draft.allDay) return words.wholeDay;

  if (draft.end === undefined || draft.end <= draft.start) return copy.events.time.noEnd;

  return formatLength(draft.end - draft.start);
}
