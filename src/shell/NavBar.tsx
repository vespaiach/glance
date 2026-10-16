import * as stylex from "@stylexjs/stylex";
import {
  CalendarDays,
  CloudSun,
  House,
  Image,
  type LucideIcon,
  Moon,
  Settings,
  StickyNote,
} from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { colors, motion, radii, shadows, sizes, space } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { TopBar } from "@/ui/TopBar";
import { type BarMode, barHeight, navLabelsShown } from "./bar";
import { VIEWS, type View, viewPath } from "./routes";

type NavBarProps = {
  active?: View;
  breakpoint: Breakpoint;
  mode?: BarMode;
  onNavigate: (path: string) => void;
};

type NavItemProps = {
  icon: LucideIcon;
  name: string;
  label?: string;
  active: boolean;
  phone: boolean;
  onClick: () => void;
};

const AMBIENT_PATH = "/ambient";

const BUTTON_PIXELS = 56;

const PHONE_BUTTON_PIXELS = 44;

const GLYPH_RATIO = 0.45;

const ICONS: Record<View, LucideIcon> = {
  today: House,
  calendar: CalendarDays,
  weather: CloudSun,
  notes: StickyNote,
  photos: Image,
  settings: Settings,
};

const styles = stylex.create({
  dock: {
    flexShrink: 0,
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
    transitionProperty: "transform, opacity",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  },
  floating: {
    position: "fixed",
    insetInline: 0,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}, ${shadows.shadow2Up}`,
  },
  hidden: {
    position: "fixed",
    insetInline: 0,
    transform: "translateY(100%)",
    opacity: 0,
    pointerEvents: "none",
  },
  bar: {
    gap: 0,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
  },
  labeledNav: {
    alignItems: "flex-start",
  },
  phoneNav: {
    width: "100%",
    justifyContent: "space-between",
    gap: 0,
  },
  item: {
    borderWidth: 0,
    padding: 0,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: "inherit",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.xxs,
    flexShrink: 0,
    cursor: "pointer",
  },
  labeledItem: {
    minWidth: sizes.iconButtonTouch,
  },
  circle: {
    width: sizes.iconButtonTouch,
    height: sizes.iconButtonTouch,
    borderRadius: radii.full,
    display: "grid",
    placeItems: "center",
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  },
  phoneCircle: {
    width: sizes.touchMin,
    height: sizes.touchMin,
  },
  activeCircle: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  label: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
  },
  activeLabel: {
    fontWeight: 540,
  },
  divider: {
    width: 1,
    height: 40,
    flexShrink: 0,
    marginInline: space.md,
    backgroundColor: colors.borderHairline,
  },
  labeledDivider: {
    marginTop: space.xs,
  },
  phoneDivider: {
    marginInline: 0,
  },
});

function NavItem({ icon, name, label, active, phone, onClick }: NavItemProps) {
  const pixels = phone ? PHONE_BUTTON_PIXELS : BUTTON_PIXELS;

  return (
    <button
      type="button"
      aria-label={name}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      {...stylex.props(styles.item, label !== undefined && styles.labeledItem, press.scale)}
    >
      <span
        {...stylex.props(styles.circle, phone && styles.phoneCircle, active && styles.activeCircle)}
      >
        <Icon icon={icon} size={Math.round(pixels * GLYPH_RATIO)} />
      </span>
      {label && (
        <span aria-hidden="true" {...stylex.props(styles.label, active && styles.activeLabel)}>
          {label}
        </span>
      )}
    </button>
  );
}

export function NavBar({ active, breakpoint, mode = "docked", onNavigate }: NavBarProps) {
  const labels = navLabelsShown(breakpoint);

  const phone = breakpoint === "phone";

  const item = (key: string, icon: LucideIcon, name: string, label: string, path: string) => (
    <NavItem
      key={key}
      icon={icon}
      name={name}
      label={labels ? label : undefined}
      active={key === active}
      phone={phone}
      onClick={() => onNavigate(path)}
    />
  );

  const views = VIEWS.filter((view) => view !== "settings").map((view) =>
    item(view, ICONS[view], copy.nav.view[view], copy.nav.view[view], viewPath(view)),
  );

  const nav = (
    <nav
      aria-label={copy.nav.label}
      {...stylex.props(styles.nav, labels && styles.labeledNav, phone && styles.phoneNav)}
    >
      {views}
      {item("ambient", Moon, copy.nav.ambientScreen, copy.nav.ambient, AMBIENT_PATH)}
      <span
        aria-hidden="true"
        {...stylex.props(
          styles.divider,
          labels && styles.labeledDivider,
          phone && styles.phoneDivider,
        )}
      />
      {item(
        "settings",
        Settings,
        copy.nav.view.settings,
        copy.nav.view.settings,
        viewPath("settings"),
      )}
    </nav>
  );

  return (
    <div
      data-bar={mode}
      inert={mode === "hidden"}
      {...stylex.props(
        styles.dock,
        mode === "floating" && styles.floating,
        mode === "hidden" && styles.hidden,
      )}
    >
      <TopBar
        height={barHeight(breakpoint)}
        xstyle={styles.bar}
        {...(phone ? { center: nav } : { right: nav })}
      />
    </div>
  );
}
