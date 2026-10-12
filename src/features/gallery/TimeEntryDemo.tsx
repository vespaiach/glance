import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { copy } from "@/copy";
import { type EventTimes, endsAfterStart, moveStart } from "@/domain/eventTimes";
import type { Clock } from "@/domain/time";
import { space } from "@/theme/tokens.stylex";
import { PillTabs } from "@/ui/PillTabs";
import { TimeField } from "@/ui/TimeField";
import { TimePicker } from "@/ui/TimePicker";

type Open = "start" | "end" | null;

type TimeEntryDemoProps = {
  compact?: boolean;
};

const CLOCKS: readonly Clock[] = ["12h", "24h"];

const words = copy.events.time;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    width: "100%",
    maxWidth: 560,
  },
  compact: {
    maxWidth: 360,
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: space.sm,
  },
});

export function TimeEntryDemo({ compact }: TimeEntryDemoProps) {
  const [clock, setClock] = useState<Clock>("12h");
  const [open, setOpen] = useState<Open>(null);
  const [times, setTimes] = useState<EventTimes>({ start: 630, end: 675 });

  const toggle = (field: Exclude<Open, null>) => setOpen(open === field ? null : field);

  const valid = endsAfterStart(times);

  return (
    <div {...stylex.props(styles.root, compact && styles.compact)}>
      <PillTabs options={CLOCKS} value={clock} onChange={setClock} />
      <div {...stylex.props(styles.fields)}>
        <TimeField
          label={words.starts}
          value={times.start}
          clock={clock}
          open={open === "start"}
          labels={words}
          onToggle={() => toggle("start")}
          compact={compact}
        />
        <TimeField
          label={words.ends}
          value={times.end}
          clock={clock}
          length={valid && times.end !== undefined ? times.end - times.start : undefined}
          open={open === "end"}
          error={valid ? undefined : words.endsBeforeStart}
          labels={words}
          onToggle={() => toggle("end")}
          compact={compact}
        />
      </div>
      {open === "start" && (
        <TimePicker
          label={words.starts}
          groupLabel={words.startGroup}
          value={times.start}
          clock={clock}
          labels={words}
          onChange={(start) => setTimes(moveStart(times, start))}
          onDone={() => setOpen(null)}
          compact={compact}
        />
      )}
      {open === "end" && (
        <TimePicker
          label={words.ends}
          groupLabel={words.endGroup}
          value={times.end ?? times.start}
          clock={clock}
          labels={words}
          onChange={(end) => setTimes({ ...times, end })}
          onDone={() => setOpen(null)}
          ends={{
            start: times.start,
            lengths: words.lengths,
            onNoEnd: () => setTimes({ start: times.start }),
          }}
          compact={compact}
        />
      )}
    </div>
  );
}
