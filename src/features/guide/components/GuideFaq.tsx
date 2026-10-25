"use client";

import * as stylex from "@stylexjs/stylex";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { copy } from "@/copy";
import { colors } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";

const FIRST_OPEN: ReadonlySet<number> = new Set([0]);

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gridColumn: { default: "span 2", "@media (max-width: 747px)": "auto" },
    minWidth: "min(100%, 320px)",
  },
  item: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderHairlineSoft,
  },
  question: {
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    fontFamily: "inherit",
    textAlign: "start",
    paddingInline: 0,
    boxSizing: "border-box",
    width: "100%",
    minHeight: 72,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBlock: 16,
    cursor: "pointer",
    fontSize: 20,
    fontWeight: 540,
    lineHeight: 1.3,
  },
  answer: {
    margin: "0 0 24px",
    maxWidth: 680,
    textWrap: "pretty",
  },
});

export function GuideFaq() {
  const [open, setOpen] = useState(FIRST_OPEN);

  const toggle = (index: number) => setOpen((current) => toggled(current, index));

  return (
    <div {...stylex.props(styles.list)}>
      {copy.guide.faq.items.map((item, index) => {
        const expanded = open.has(index);

        return (
          <div key={item.q} {...stylex.props(styles.item)}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => toggle(index)}
              {...stylex.props(styles.question)}
            >
              <span>{item.q}</span>
              <Icon icon={expanded ? ChevronUp : ChevronDown} size={24} />
            </button>
            {expanded && <p {...stylex.props(styles.answer)}>{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

function toggled(open: ReadonlySet<number>, index: number): ReadonlySet<number> {
  const next = new Set(open);

  if (!next.delete(index)) next.add(index);

  return next;
}
