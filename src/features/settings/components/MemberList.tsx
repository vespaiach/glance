import * as stylex from "@stylexjs/stylex";
import { Trash2 } from "lucide-react";
import { copy } from "@/copy";
import type { TagColor } from "@/domain/schemas";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { tagFills } from "@/ui/tagFills";

export type Member = {
  id: string;
  name: string;
  color: TagColor;
  plans: number;
  result: string;
};

type MemberListProps = {
  members: readonly Member[];
  asking: string | null;
  onAsk: (id: string) => void;
  onCancel: () => void;
  onRemove: (id: string) => void;
};

type MemberRowProps = Omit<MemberListProps, "members" | "asking"> & {
  member: Member;
  asking: boolean;
  removable: boolean;
  divided: boolean;
};

const text = copy.settings.family;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    boxShadow: shadows.shadow1,
    padding: "clamp(20px, 2.4vw, 32px)",
    boxSizing: "border-box",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: `0 ${space.md}`,
    listStyle: "none",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: `${space.sm} ${space.md}`,
    minHeight: 64,
    padding: "10px 0",
    boxSizing: "border-box",
  },
  divided: {
    boxShadow: `inset 0 1px 0 ${colors.borderHairline}`,
  },
  who: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    minWidth: 0,
    flex: "1 1 140px",
  },
  circle: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: radii.full,
  },
  texts: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: 540,
    letterSpacing: "-0.1px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  body: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  remove: {
    boxShadow: shadows.shadow1,
  },
  ask: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.xs,
    flex: "1 1 100%",
    minWidth: 0,
  },
  confirm: {
    maxWidth: "100%",
    whiteSpace: "normal",
    textAlign: "center",
  },
});

export function MemberList({ members, asking, onAsk, onCancel, onRemove }: MemberListProps) {
  const removable = members.length > 1;

  return (
    <section {...stylex.props(styles.root)}>
      <Eyebrow>{text.eyebrow(members.length)}</Eyebrow>
      <ul aria-label={text.list} {...stylex.props(styles.list)}>
        {members.map((member, index) => (
          <MemberRow
            key={member.id}
            member={member}
            asking={asking === member.id}
            removable={removable}
            divided={index > 0}
            onAsk={onAsk}
            onCancel={onCancel}
            onRemove={onRemove}
          />
        ))}
      </ul>
      {!removable && <span {...stylex.props(styles.body)}>{text.lastMember}</span>}
    </section>
  );
}

function MemberRow({
  member,
  asking,
  removable,
  divided,
  onAsk,
  onCancel,
  onRemove,
}: MemberRowProps) {
  const label = text.removeName(member.name);

  return (
    <li {...stylex.props(styles.row, divided && styles.divided)}>
      <div {...stylex.props(styles.who)}>
        <span aria-hidden {...stylex.props(styles.circle, tagFills[member.color])} />
        <div {...stylex.props(styles.texts)}>
          <span {...stylex.props(styles.name)}>{member.name}</span>
          {asking ? (
            <span {...stylex.props(styles.body)}>{member.result}</span>
          ) : (
            <Eyebrow size="caption">{text.plans(member.plans)}</Eyebrow>
          )}
        </div>
      </div>
      {removable && !asking && (
        <Button
          variant="secondary"
          icon={Trash2}
          aria-label={label}
          onClick={() => onAsk(member.id)}
          xstyle={styles.remove}
        >
          {text.remove}
        </Button>
      )}
      {asking && (
        <div {...stylex.props(styles.ask)}>
          <Button variant="ghost" onClick={onCancel}>
            {text.cancel}
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => onRemove(member.id)}
            xstyle={styles.confirm}
          >
            {label}
          </Button>
        </div>
      )}
    </li>
  );
}
