"use client";

import * as stylex from "@stylexjs/stylex";
import { UserMinus } from "lucide-react";
import { useEffect, useRef } from "react";
import { copy } from "@/copy";
import { colors, radii, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { PersonDot } from "@/ui/PersonDot";
import type { FamilyRow } from "../familySheet";

type MemberRowProps = {
  row: FamilyRow;
  first: boolean;
  canRemove: boolean;
  confirming: boolean;
  onAsk: () => void;
  onKeep: () => void;
  onRemove: () => void;
};

type RemoveConfirmProps = {
  name: string;
  impact: string;
  onKeep: () => void;
  onRemove: () => void;
};

const words = copy.family;

const styles = stylex.create({
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingBlock: 8,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairlineSoft,
  },
  first: {
    borderTopWidth: 0,
  },
  line: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minHeight: 56,
  },
  text: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: 480,
    letterSpacing: "-0.2px",
    lineHeight: 1.2,
    overflowWrap: "anywhere",
  },
  count: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
  confirm: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    paddingBlock: 16,
    paddingInlineStart: 20,
    paddingInlineEnd: 16,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px 16px",
  },
  message: {
    flex: "1 1 220px",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  title: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
    lineHeight: 1.2,
  },
  body: {
    fontSize: type.bodySize,
    fontWeight: type.bodyLgWeight,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  buttons: {
    display: "flex",
    gap: 8,
  },
  cancel: {
    boxShadow: shadows.shadow1,
  },
});

export function MemberRow({
  row,
  first,
  canRemove,
  confirming,
  onAsk,
  onKeep,
  onRemove,
}: MemberRowProps) {
  const { member, solo, shared } = row;

  const [removeButton, keep] = useFocusAfterKeep(confirming, onKeep);

  return (
    <li {...stylex.props(styles.row, first && styles.first)}>
      <div {...stylex.props(styles.line)}>
        <PersonDot color={member.color} size="lg" />
        <span {...stylex.props(styles.text)}>
          <span {...stylex.props(styles.name)}>{member.name}</span>
          <span {...stylex.props(styles.count)}>{words.plans(solo + shared)}</span>
        </span>
        {canRemove && !confirming && (
          <Button
            ref={removeButton}
            variant="ghost"
            icon={UserMinus}
            aria-label={words.removeMember(member.name)}
            onClick={onAsk}
          >
            {words.remove}
          </Button>
        )}
      </div>
      {confirming && (
        <RemoveConfirm
          name={member.name}
          impact={words.impact(solo, shared)}
          onKeep={keep}
          onRemove={onRemove}
        />
      )}
    </li>
  );
}

function RemoveConfirm({ name, impact, onKeep, onRemove }: RemoveConfirmProps) {
  const cancel = useFocusWhileShown();

  return (
    <div role="alert" {...stylex.props(styles.confirm)}>
      <div {...stylex.props(styles.message)}>
        <span {...stylex.props(styles.title)}>{words.confirmTitle(name)}</span>
        <span {...stylex.props(styles.body)}>{impact}</span>
      </div>
      <div {...stylex.props(styles.buttons)}>
        <Button ref={cancel} variant="secondary" onClick={onKeep} xstyle={styles.cancel}>
          {words.cancel}
        </Button>
        <Button variant="danger" icon={UserMinus} onClick={onRemove}>
          {words.remove}
        </Button>
      </div>
    </div>
  );
}

function useFocusAfterKeep(confirming: boolean, onKeep: () => void) {
  const button = useRef<HTMLButtonElement>(null);

  const kept = useRef(false);

  useEffect(() => {
    if (confirming || !kept.current) return;

    kept.current = false;
    button.current?.focus();
  }, [confirming]);

  const keep = () => {
    kept.current = true;
    onKeep();
  };

  return [button, keep] as const;
}

function useFocusWhileShown() {
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = cancel.current?.closest<HTMLElement>("[role=dialog]");

    cancel.current?.focus();

    return () => {
      if (document.activeElement === document.body) dialog?.focus();
    };
  }, []);

  return cancel;
}
