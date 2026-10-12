import * as stylex from "@stylexjs/stylex";
import {
  CalendarDays,
  CloudSun,
  House,
  Image,
  type LucideIcon,
  Settings,
  StickyNote,
} from "lucide-react";
import { copy } from "@/copy";
import { colors, sizes, space } from "@/theme/tokens.stylex";
import { IconButton } from "@/ui/IconButton";
import { TopBar } from "@/ui/TopBar";
import { VIEWS, type View, viewPath } from "./routes";

type NavBarProps = {
  active?: View;
  compact: boolean;
  onNavigate: (path: string) => void;
};

const ICONS: Record<View, LucideIcon> = {
  today: House,
  calendar: CalendarDays,
  weather: CloudSun,
  notes: StickyNote,
  photos: Image,
  settings: Settings,
};

const BAR_HEIGHT = 72;

const styles = stylex.create({
  bar: {
    flexShrink: 0,
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  nav: {
    display: "flex",
    gap: space.xs,
  },
  compactNav: {
    gap: space.xxs,
  },
  compactButton: {
    width: sizes.touchMin,
    height: sizes.touchMin,
  },
});

export function NavBar({ active, compact, onNavigate }: NavBarProps) {
  const buttons = VIEWS.map((view) => (
    <IconButton
      key={view}
      icon={ICONS[view]}
      label={copy.nav.view[view]}
      size={compact ? "md" : "touch"}
      active={view === active}
      current={view === active ? "page" : undefined}
      onClick={() => onNavigate(viewPath(view))}
      xstyle={compact && styles.compactButton}
    />
  ));

  return (
    <TopBar
      height={BAR_HEIGHT}
      xstyle={styles.bar}
      right={
        <nav
          aria-label={copy.nav.label}
          {...stylex.props(styles.nav, compact && styles.compactNav)}
        >
          {buttons}
        </nav>
      }
    />
  );
}
