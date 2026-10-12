import type * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

type SourceFailureProps = {
  icon: LucideIcon;
  title: ReactNode;
  body: ReactNode;
  retryLabel: string;
  onRetry: () => void;
  eyebrow?: ReactNode;
  size?: "md" | "lg";
  xstyle?: stylex.StyleXStyles;
};

export function SourceFailure({ retryLabel, onRetry, ...rest }: SourceFailureProps) {
  return (
    <div role="status">
      <EmptyState
        {...rest}
        action={
          <Button variant="secondary" icon={RotateCw} onClick={onRetry}>
            {retryLabel}
          </Button>
        }
      />
    </div>
  );
}
