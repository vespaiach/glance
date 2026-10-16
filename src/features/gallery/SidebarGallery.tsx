import * as stylex from "@stylexjs/stylex";
import { useReducer } from "react";
import { SidebarDrawer } from "@/shell/SidebarDrawer";
import { SidebarGrip } from "@/shell/SidebarGrip";
import { SidebarRail } from "@/shell/SidebarRail";
import { initialSidebar, type SidebarMode, sidebarInset, sidebarReducer } from "@/shell/sidebar";
import { colors, motion, space } from "@/theme/tokens.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { gallery } from "./samples";

type Size = "wide" | "phone";

const MODES: readonly SidebarMode[] = ["hidden", "rail", "expanded"];

const SIZES: readonly Size[] = ["wide", "phone"];

const FIXTURE: Record<SidebarMode, "1" | "open" | undefined> = {
  hidden: undefined,
  rail: "1",
  expanded: "open",
};

const styles = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.md,
  },
  demo: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  stage: {
    position: "relative",
    contain: "layout paint",
    overflow: "hidden",
    backgroundColor: colors.hairlineSoft,
  },
  wide: {
    width: 960,
    maxWidth: "100%",
    height: 640,
  },
  phone: {
    width: 390,
    maxWidth: "100%",
    height: 844,
  },
  page: {
    height: "100%",
    boxSizing: "border-box",
    transitionProperty: "padding-left",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeSlide,
  },
  inset: (inset: number) => ({ paddingLeft: inset }),
  panel: {
    height: "100%",
    boxSizing: "border-box",
    padding: space.lg,
  },
});

function SidebarDemo({ mode, size }: { mode: SidebarMode; size: Size }) {
  const [state, dispatch] = useReducer(sidebarReducer, FIXTURE[mode], initialSidebar);

  const caption = `${gallery.sidebar[mode]} · ${gallery.sidebar[size]}`;

  return (
    <div {...stylex.props(styles.demo)}>
      <Eyebrow>{caption}</Eyebrow>
      <div {...stylex.props(styles.stage, styles[size])}>
        <div {...stylex.props(styles.page, styles.inset(sidebarInset(state.mode)))}>
          <div {...stylex.props(styles.panel)}>
            <Eyebrow>{gallery.groups.today}</Eyebrow>
          </div>
        </div>
        {state.mode === "hidden" && <SidebarGrip onShow={() => dispatch({ type: "show" })} />}
        <SidebarRail
          mode={state.mode}
          active="today"
          onOpen={() => dispatch({ type: "open" })}
          onNavigate={() => dispatch({ type: "viewChanged" })}
        />
        <SidebarDrawer
          open={state.mode === "expanded"}
          active="today"
          onClose={() => dispatch({ type: "close" })}
          onNavigate={() => dispatch({ type: "viewChanged" })}
        />
      </div>
    </div>
  );
}

export function SidebarGallery() {
  return (
    <>
      {SIZES.map((size) => (
        <div key={size} {...stylex.props(styles.row)}>
          {MODES.map((mode) => (
            <SidebarDemo key={mode} mode={mode} size={size} />
          ))}
        </div>
      ))}
    </>
  );
}
