import * as stylex from "@stylexjs/stylex";
import { CloudSun } from "lucide-react";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { StickyNote } from "@/ui/StickyNote";

type PreviewEvent = (typeof copy.signIn.preview.events)[number];

const styles = stylex.create({
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 20,
    minWidth: 0,
  },
  events: {
    flex: "1.6 1 320px",
    minWidth: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: shadows.shadow2,
  },
  eyebrow: {
    padding: "4px 12px 8px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "100px 16px minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: space.sm,
    padding: "10px 12px",
    borderRadius: radii.md,
    whiteSpace: "nowrap",
    boxShadow: `inset 0 -1px 0 ${colors.borderHairlineSoft}`,
  },
  rowNow: {
    backgroundColor: season.block1,
    boxShadow: "none",
  },
  start: {
    fontFamily: type.fontMono,
    fontSize: 20,
    letterSpacing: "0.54px",
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: radii.full,
  },
  dotPast: { backgroundColor: colors.borderHairline },
  dotNow: { backgroundColor: season.block4 },
  dotUpcoming: { backgroundColor: season.block2 },
  title: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
    lineHeight: 1.25,
  },
  titlePast: {
    fontWeight: 340,
    textDecorationLine: "line-through",
    textDecorationThickness: 1,
  },
  pill: {
    padding: "6px 14px",
    borderRadius: radii.pill,
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  },
  side: {
    flex: "1 1 200px",
    minWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: space.lg,
  },
  weather: {
    flex: "1 1 180px",
    minWidth: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    padding: "20px 24px",
    borderRadius: radii.lg,
    backgroundColor: season.block3,
  },
  weatherTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  temperature: {
    fontSize: 64,
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: "-2px",
    fontVariantNumeric: "tabular-nums",
  },
  rain: {
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.35,
    textWrap: "pretty",
  },
  note: {
    flex: "1 1 180px",
    minWidth: 0,
  },
});

const DOTS = { past: styles.dotPast, now: styles.dotNow, upcoming: styles.dotUpcoming };

export function SignInPreview() {
  const { preview } = copy.signIn;

  return (
    <div aria-hidden {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.events)}>
        <Eyebrow xstyle={styles.eyebrow}>{preview.eyebrow}</Eyebrow>
        {preview.events.map((event) => (
          <PreviewRow key={event.title} event={event} />
        ))}
      </div>
      <div {...stylex.props(styles.side)}>
        <div {...stylex.props(styles.weather)}>
          <div {...stylex.props(styles.weatherTop)}>
            <span {...stylex.props(styles.temperature)}>{preview.temperature}</span>
            <Icon icon={CloudSun} size={48} />
          </div>
          <span {...stylex.props(styles.rain)}>{preview.rain}</span>
        </div>
        <StickyNote
          tone={2}
          rotate={2}
          width="auto"
          minHeight={0}
          author={preview.noteAuthor}
          time={preview.noteTime}
          xstyle={styles.note}
        >
          {preview.note}
        </StickyNote>
      </div>
    </div>
  );
}

function PreviewRow({ event }: { event: PreviewEvent }) {
  const now = event.status === "now";

  return (
    <div {...stylex.props(styles.row, now && styles.rowNow)}>
      <span {...stylex.props(styles.start)}>{event.start}</span>
      <span {...stylex.props(styles.dot, DOTS[event.status])} />
      <span {...stylex.props(styles.title, event.status === "past" && styles.titlePast)}>
        {event.title}
      </span>
      {now && <span {...stylex.props(styles.pill)}>{copy.events.now}</span>}
    </div>
  );
}
