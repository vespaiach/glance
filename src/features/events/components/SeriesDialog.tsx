import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { copy } from "@/copy";
import { formatLongWeekday, formatMonthDay, formatWeekday } from "@/domain/time";
import { parseDateKey } from "@/domain/zone";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Eyebrow } from "@/ui/Eyebrow";

export type SeriesDialogProps = {
  kind: "delete" | "save";
  title: string;
  day: string;
  onOne: () => void;
  onAll: () => void;
  onCancel: () => void;
};

const text = copy.events.series;

const styles = stylex.create({
  card: {
    maxWidth: 520,
    gap: 28,
    paddingTop: "clamp(24px, 3vw, 40px)",
    paddingInline: "clamp(24px, 3vw, 40px)",
    paddingBottom: "clamp(24px, 3vw, 40px)",
  },
  message: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: "clamp(26px, 2.4vw, 32px)",
    fontWeight: 540,
    letterSpacing: "-0.6px",
    lineHeight: 1.1,
    textWrap: "pretty",
  },
  body: {
    margin: 0,
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
});

export function SeriesDialog({ kind, title, day, onOne, onAll, onCancel }: SeriesDialogProps) {
  const titleId = useId();

  const date = parseDateKey(day);

  const weekday = formatLongWeekday(date, "UTC");

  const name = title.trim() || text.untitled;

  const when = `${formatWeekday(date, "UTC")}, ${formatMonthDay(date, "UTC")}`;

  const deleting = kind === "delete";

  return (
    <Dialog labelledBy={titleId} xstyle={styles.card} onClose={onCancel}>
      <div {...stylex.props(styles.message)}>
        <Eyebrow>{text.eyebrow(weekday)}</Eyebrow>
        <h2 id={titleId} {...stylex.props(styles.title)}>
          {deleting ? text.deleteTitle : text.saveTitle}
        </h2>
        <p {...stylex.props(styles.body)}>
          {deleting ? text.deleteBody(name, weekday, when) : text.saveBody(name, weekday, when)}
        </p>
      </div>
      <div {...stylex.props(styles.buttons)}>
        <Button variant="secondary" fullWidth onClick={onOne}>
          {text.one}
        </Button>
        <Button variant={deleting ? "danger" : "primary"} fullWidth onClick={onAll}>
          {text.all}
        </Button>
        <Button variant="ghost" fullWidth onClick={onCancel}>
          {deleting ? text.keepEvent : text.keepEditing}
        </Button>
      </div>
    </Dialog>
  );
}
