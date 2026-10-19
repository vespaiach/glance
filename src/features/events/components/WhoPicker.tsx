import * as stylex from "@stylexjs/stylex";
import { Users } from "lucide-react";
import type { ReactNode } from "react";
import type { EventWho } from "@/domain/members";
import type { Member } from "@/domain/schemas";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "@/ui/Icon";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";

type WhoPickerProps = {
  label: string;
  everyoneLabel: string;
  members: readonly Member[];
  who: EventWho;
  onEveryone: () => void;
  onMember: (id: string) => void;
};

type WhoPillProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
  },
  pills: {
    borderWidth: 0,
    margin: 0,
    padding: 0,
    minWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderWidth: 0,
    cursor: "pointer",
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingInlineStart: 14,
    paddingInlineEnd: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    fontFamily: type.fontSans,
    fontSize: 16,
    fontWeight: 480,
    transitionProperty: "transform, background-color, color",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
});

export function WhoPicker({
  label,
  everyoneLabel,
  members,
  who,
  onEveryone,
  onMember,
}: WhoPickerProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <span aria-hidden="true" {...stylex.props(styles.label)}>
        {label}
      </span>
      <fieldset aria-label={label} {...stylex.props(styles.pills)}>
        <WhoPill selected={who.everyone} onClick={onEveryone}>
          <Icon icon={Users} size={16} />
          {everyoneLabel}
        </WhoPill>
        {members.map((member) => (
          <WhoPill
            key={member.id}
            selected={who.everyone || who.memberIds.includes(member.id)}
            onClick={() => onMember(member.id)}
          >
            <PersonDot color={member.color} />
            {member.name}
          </WhoPill>
        ))}
      </fieldset>
    </div>
  );
}

function WhoPill({ selected, onClick, children }: WhoPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      {...stylex.props(styles.pill, press.scale, selected && styles.selected)}
    >
      {children}
    </button>
  );
}
