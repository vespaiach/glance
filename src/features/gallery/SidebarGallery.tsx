import * as stylex from "@stylexjs/stylex";
import { useReducer } from "react";
import { SidebarDrawer } from "@/shell/SidebarDrawer";
import { SidebarGrip } from "@/shell/SidebarGrip";
import { SidebarHandle } from "@/shell/SidebarHandle";
import { SidebarRail } from "@/shell/SidebarRail";
import { initialSidebar, type SidebarMode, sidebarInset, sidebarReducer } from "@/shell/sidebar";
import { colors, motion, space } from "@/theme/tokens.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { gallery } from "./samples";

type Size = "large" | "small";

const MODES: Record<Size, readonly SidebarMode[]> = {
  large: ["hidden", "rail", "expanded"],
  small: ["hidden", "expanded"],
};

const SIZES: readonly Size[] = ["large", "small"];

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
  large: {
    width: 960,
    maxWidth: "100%",
    height: 640,
  },
  small: {
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

export function SidebarGallery() {
  return (
    <>
      {SIZES.map((size) => (
        <div key={size} {...stylex.props(styles.row)}>
          {MODES[size].map((mode) => (
            <SidebarDemo key={mode} mode={mode} size={size} />
          ))}
        </div>
      ))}
    </>
  );
}

function SidebarDemo({ mode, size }: { mode: SidebarMode; size: Size }) {
  const [state, dispatch] = useReducer(sidebarReducer, FIXTURE[mode], (rail) =>
    initialSidebar(rail, "today", size === "small"),
  );

  const small = size === "small";

  const caption = `${gallery.sidebar[mode]} · ${gallery.sidebar[size]}`;

  return (
    <div {...stylex.props(styles.demo)}>
      <Eyebrow>{caption}</Eyebrow>
      <div {...stylex.props(styles.stage, styles[size])}>
        <div {...stylex.props(styles.page, styles.inset(sidebarInset(state.mode, "today", small)))}>
          <div {...stylex.props(styles.panel)}>
            <Eyebrow>{gallery.groups.today}</Eyebrow>
          </div>
        </div>
        <SidebarGrip
          small={small}
          shown={state.mode === "hidden"}
          onShow={() => dispatch({ type: "show", small })}
        />
        {!small && (
          <>
            <SidebarRail
              mode={state.mode}
              active="today"
              onHide={() => dispatch({ type: "hide" })}
              onNavigate={() => dispatch({ type: "viewChanged", view: "today" })}
            />
            <SidebarHandle
              shown={state.mode !== "hidden"}
              expanded={state.mode === "expanded"}
              onOpen={() => dispatch({ type: "open" })}
            />
          </>
        )}
        <SidebarDrawer
          open={state.mode === "expanded"}
          small={small}
          active="today"
          onClose={() => dispatch({ type: "close" })}
          onScrimTap={() => dispatch({ type: "back", small })}
          onNavigate={() => dispatch({ type: "viewChanged", view: "today", small })}
        />
      </div>
    </div>
  );
}
