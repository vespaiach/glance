import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";
import { shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "./Button";

type DiscardMessageProps = {
  title: string;
  body: string;
};

type DiscardButtonsProps = {
  keepLabel: string;
  discardLabel: string;
  onKeep: () => void;
  onDiscard: () => void;
};

const styles = stylex.create({
  message: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
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
  keep: {
    boxShadow: shadows.shadow1,
  },
});

export function DiscardMessage({ title, body }: DiscardMessageProps) {
  return (
    <div role="alert" {...stylex.props(styles.message)}>
      <span {...stylex.props(styles.title)}>{title}</span>
      <span {...stylex.props(styles.body)}>{body}</span>
    </div>
  );
}

export function DiscardButtons({
  keepLabel,
  discardLabel,
  onKeep,
  onDiscard,
}: DiscardButtonsProps) {
  const keep = useFocusWhileShown();

  return (
    <>
      <Button ref={keep} variant="secondary" onClick={onKeep} xstyle={styles.keep}>
        {keepLabel}
      </Button>
      <Button variant="danger" onClick={onDiscard}>
        {discardLabel}
      </Button>
    </>
  );
}

function useFocusWhileShown() {
  const keep = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = keep.current?.closest<HTMLElement>("[role=dialog]");

    keep.current?.focus();

    return () => {
      if (document.activeElement === document.body) dialog?.focus();
    };
  }, []);

  return keep;
}
