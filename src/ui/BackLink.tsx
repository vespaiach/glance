import * as stylex from "@stylexjs/stylex";
import { ChevronLeft } from "lucide-react";
import { Button } from "./Button";

type BackLinkProps = {
  label: string;
  onBack: () => void;
};

const styles = stylex.create({
  row: {
    gridColumn: "1 / -1",
    display: "flex",
    marginBottom: -8,
  },
  button: {
    marginLeft: -16,
  },
});

export function BackLink({ label, onBack }: BackLinkProps) {
  return (
    <div {...stylex.props(styles.row)}>
      <Button variant="ghost" icon={ChevronLeft} onClick={onBack} xstyle={styles.button}>
        {label}
      </Button>
    </div>
  );
}
