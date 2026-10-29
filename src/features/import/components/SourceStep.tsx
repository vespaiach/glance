import * as stylex from "@stylexjs/stylex";
import { ChevronRight, FolderOpen, Info, type LucideIcon, Smartphone, Undo2 } from "lucide-react";
import { useRef } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Tag } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { type ImportPageAction, type ImportWho, whoName } from "../importPage";
import { panel } from "./importStyles";

export type LastImport = {
  date: string;
  count: number;
  who: ImportWho;
  canUndo: boolean;
};

type SourceStepProps = {
  breakpoint: Breakpoint;
  last?: LastImport;
  tags: readonly Tag[];
  dispatch: (action: ImportPageAction) => void;
  onFile: (file: File) => void;
  onUndoLast: () => void;
};

type TileProps = {
  icon: LucideIcon;
  title: string;
  hint: string;
  phone?: boolean;
  onClick: () => void;
};

const words = copy.import.source;

const styles = stylex.create({
  tiles: {
    minWidth: 0,
    display: "grid",
    gridAutoRows: "minmax(160px, 1fr)",
    gap: 24,
  },
  tile: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: "clamp(16px, 2.4vw, 32px)",
    padding: "clamp(24px, 3vw, 40px)",
    borderWidth: 0,
    borderRadius: 24,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    fontFamily: "inherit",
    textAlign: "left",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  phone: {
    backgroundColor: season.block1,
  },
  tileText: {
    flexGrow: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  tileTitle: {
    fontSize: "clamp(24px, 2.4vw, 32px)",
    fontWeight: 540,
    letterSpacing: "-0.5px",
  },
  tileHint: {
    fontSize: "clamp(15px, 1.3vw, 18px)",
    fontWeight: 330,
  },
  lastText: {
    flexGrow: 1,
    flexBasis: 160,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  lastLine: {
    fontSize: 17,
    fontWeight: 540,
  },
  limits: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  hidden: {
    display: "none",
  },
});

const columns = stylex.create({
  large: { gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)" },
  normal: { gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)" },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export function SourceStep({
  breakpoint,
  last,
  tags,
  dispatch,
  onFile,
  onUndoLast,
}: SourceStepProps) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div {...stylex.props(panel.grid, columns[breakpoint])}>
      <section {...stylex.props(panel.card)}>
        <Eyebrow>{words.eyebrow}</Eyebrow>
        <h2 {...stylex.props(panel.headline)}>{words.headline}</h2>
        <p {...stylex.props(panel.body)}>{words.body}</p>
        {last && <LastTile last={last} tags={tags} onUndo={onUndoLast} />}
        <span {...stylex.props(panel.spacer)} />
        <span {...stylex.props(styles.limits)}>
          <Icon icon={Info} size={18} />
          <span {...stylex.props(panel.mono)}>{words.limits}</span>
        </span>
      </section>
      <div {...stylex.props(styles.tiles)}>
        <Tile
          icon={Smartphone}
          title={words.phone}
          hint={words.phoneHint}
          phone
          onClick={() => dispatch({ type: "phone" })}
        />
        <Tile
          icon={FolderOpen}
          title={words.file}
          hint={words.fileHint}
          onClick={() => input.current?.click()}
        />
        <input
          ref={input}
          type="file"
          accept=".ics,text/calendar"
          aria-label={words.file}
          onChange={(event) => pick(event.currentTarget, onFile)}
          {...stylex.props(styles.hidden)}
        />
      </div>
    </div>
  );
}

function LastTile({
  last,
  tags,
  onUndo,
}: {
  last: LastImport;
  tags: readonly Tag[];
  onUndo: () => void;
}) {
  return (
    <div {...stylex.props(panel.softTile)}>
      <span {...stylex.props(styles.lastText)}>
        <span {...stylex.props(panel.mono)}>{words.last(last.date)}</span>
        <span {...stylex.props(styles.lastLine)}>
          {words.lastLine(last.count, whoName(last.who, tags))}
        </span>
      </span>
      {last.canUndo && (
        <Button variant="ghost" icon={Undo2} onClick={onUndo}>
          {words.undo}
        </Button>
      )}
    </div>
  );
}

function Tile({ icon, title, hint, phone, onClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...stylex.props(styles.tile, phone && styles.phone, press.scale)}
    >
      <span
        {...stylex.props(
          panel.round("clamp(64px, 6vw, 96px)"),
          phone ? panel.onCanvas : panel.onSoft,
        )}
      >
        <Icon icon={icon} size={36} />
      </span>
      <span {...stylex.props(styles.tileText)}>
        <span {...stylex.props(styles.tileTitle)}>{title}</span>
        <span {...stylex.props(styles.tileHint)}>{hint}</span>
      </span>
      <Icon icon={ChevronRight} size={28} />
    </button>
  );
}

function pick(input: HTMLInputElement, onFile: (file: File) => void) {
  const file = input.files?.[0];

  input.value = "";

  if (file) onFile(file);
}
