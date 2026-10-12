import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { copy } from "@/copy";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { IconButton } from "@/ui/IconButton";
import { MonthGrid } from "@/ui/MonthGrid";

type MonthBlockProps = {
  title: string;
  year: number;
  month: number;
  today?: number;
  selected: number;
  marked: readonly number[];
  cell: number;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onSelectDay?: (day: number) => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  title: {
    margin: 0,
    fontSize: type.displayLgSize,
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
  },
  chevrons: {
    display: "flex",
    gap: space.xs,
  },
  grid: {
    display: "flex",
    justifyContent: "center",
  },
});

export function MonthBlock({
  title,
  year,
  month,
  today,
  selected,
  marked,
  cell,
  onPreviousMonth,
  onNextMonth,
  onSelectDay,
  xstyle,
}: MonthBlockProps) {
  return (
    <ColorBlock tone="soft" padding="clamp(16px, 3vw, 32px)" xstyle={[styles.root, xstyle]}>
      <div {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.title)}>{title}</h2>
        <div {...stylex.props(styles.chevrons)}>
          <IconButton
            icon={ChevronLeft}
            label={copy.calendar.previousMonth}
            variant="canvas"
            size="touch"
            onClick={onPreviousMonth}
          />
          <IconButton
            icon={ChevronRight}
            label={copy.calendar.nextMonth}
            variant="canvas"
            size="touch"
            onClick={onNextMonth}
          />
        </div>
      </div>
      <div {...stylex.props(styles.grid)}>
        <MonthGrid
          year={year}
          month={month}
          today={today}
          selected={selected}
          marked={marked}
          onSelect={onSelectDay}
          showTitle={false}
          cell={cell}
        />
      </div>
    </ColorBlock>
  );
}
