import * as stylex from "@stylexjs/stylex";
import { Undo2 } from "lucide-react";
import { copy } from "@/copy";
import type { Tag } from "@/domain/schemas";
import type { TagFilter } from "@/domain/tags";
import { colors } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { IconButton } from "@/ui/IconButton";
import { WhoFilter } from "@/ui/WhoFilter";

type CalendarToolbarProps = {
  tags: readonly Tag[];
  filter: ReadonlySet<string>;
  small: boolean;
  whoSheet: boolean;
  onFilter: (filter: TagFilter) => void;
  onToday?: () => void;
};

const styles = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 16,
  },
  oneRow: {
    flexWrap: "nowrap",
    columnGap: 8,
  },
  people: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 12,
    columnGap: 16,
    flexShrink: 0,
    minWidth: 0,
  },
  soft: (height: number) => ({
    flexShrink: 0,
    minHeight: height,
    backgroundColor: colors.surfaceSoft,
  }),
  today: {
    paddingInlineStart: 18,
    paddingInlineEnd: 22,
  },
  goToday: {
    width: 44,
    height: 44,
  },
});

const TODAY_HEIGHT = 48;

const STACK_MAX = { small: 4, large: 8 } as const;

const SMALL_STACK_BESIDE_TODAY = 3;

export function CalendarToolbar({
  tags,
  filter,
  small,
  whoSheet,
  onFilter,
  onToday,
}: CalendarToolbarProps) {
  const size = small ? "small" : "large";

  const max = small && onToday ? SMALL_STACK_BESIDE_TODAY : STACK_MAX[size];

  return (
    <div {...stylex.props(styles.row, small && styles.oneRow)}>
      <div {...stylex.props(styles.people)}>
        <WhoFilter
          tags={tags}
          selected={filter}
          size={size}
          max={max}
          labels={copy.personFilter}
          defaultOpen={whoSheet}
          onChange={onFilter}
        />
      </div>
      {onToday && (
        <div {...stylex.props(styles.actions)}>
          {small ? (
            <IconButton
              icon={Undo2}
              label={copy.calendar.goToday}
              onClick={onToday}
              xstyle={styles.goToday}
            />
          ) : (
            <Button
              variant="ghost"
              icon={Undo2}
              onClick={onToday}
              xstyle={[styles.soft(TODAY_HEIGHT), styles.today]}
            >
              {copy.calendar.today}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
