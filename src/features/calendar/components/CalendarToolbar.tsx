import * as stylex from "@stylexjs/stylex";
import { Plus, Undo2 } from "lucide-react";
import { copy } from "@/copy";
import type { Tag } from "@/domain/schemas";
import type { TagFilter } from "@/domain/tags";
import { colors } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { WhoFilter } from "@/ui/WhoFilter";

type CalendarToolbarProps = {
  tags: readonly Tag[];
  filter: ReadonlySet<string>;
  small: boolean;
  whoSheet: boolean;
  onFilter: (filter: TagFilter) => void;
  onAddEvent?: () => void;
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
  actionsSmall: {
    flexShrink: 1,
  },
  soft: (height: number) => ({
    flexShrink: 0,
    minHeight: height,
    backgroundColor: colors.surfaceSoft,
  }),
  add: {
    paddingInlineStart: 18,
    paddingInlineEnd: 22,
  },
});

const HEIGHT = { small: 44, large: 48 } as const;

const STACK_MAX = { small: 4, large: 8 } as const;

export function CalendarToolbar({
  tags,
  filter,
  small,
  whoSheet,
  onFilter,
  onAddEvent,
  onToday,
}: CalendarToolbarProps) {
  const size = small ? "small" : "large";

  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.people)}>
        <WhoFilter
          tags={tags}
          selected={filter}
          size={size}
          max={STACK_MAX[size]}
          labels={copy.personFilter}
          defaultOpen={whoSheet}
          onChange={onFilter}
        />
      </div>
      <div {...stylex.props(styles.actions, small && styles.actionsSmall)}>
        {onToday && (
          <Button
            variant="ghost"
            icon={Undo2}
            onClick={onToday}
            xstyle={[styles.soft(HEIGHT[size]), styles.add]}
          >
            {copy.calendar.today}
          </Button>
        )}
        {onAddEvent && (
          <Button
            variant="ghost"
            icon={Plus}
            onClick={onAddEvent}
            xstyle={[styles.soft(HEIGHT[size]), styles.add]}
          >
            {copy.calendar.addEvent}
          </Button>
        )}
      </div>
    </div>
  );
}
