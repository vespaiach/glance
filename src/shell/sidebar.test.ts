import {
  initialSidebar,
  type SidebarAction,
  type SidebarMode,
  sidebarInset,
  sidebarReducer,
} from "./sidebar";

const ON_CALENDAR = { type: "viewChanged", view: "calendar" } as const;

const ON_TODAY = { type: "viewChanged", view: "today" } as const;

test.each([
  ["show", "hidden", "rail", { type: "show" }],
  ["open", "rail", "expanded", { type: "open" }],
  ["close", "expanded", "hidden", { type: "close" }],
  ["hide", "rail", "hidden", { type: "hide" }],
  ["back", "expanded", "rail", { type: "back" }],
  ["viewChanged to Calendar", "expanded", "rail", ON_CALENDAR],
  ["viewChanged to Calendar", "hidden", "rail", ON_CALENDAR],
  ["viewChanged to Today", "expanded", "rail", ON_TODAY],
] as const satisfies readonly (readonly [string, SidebarMode, SidebarMode, SidebarAction])[])(
  "SHELL-08 %s turns %s into %s",
  (_name, from, to, action) => {
    expect(sidebarReducer({ mode: from }, action)).toEqual({ mode: to });
  },
);

test.each([
  ["show", "rail", { type: "show" }],
  ["show", "expanded", { type: "show" }],
  ["open", "hidden", { type: "open" }],
  ["open", "expanded", { type: "open" }],
  ["close", "hidden", { type: "close" }],
  ["close", "rail", { type: "close" }],
  ["hide", "hidden", { type: "hide" }],
  ["hide", "expanded", { type: "hide" }],
  ["back", "hidden", { type: "back" }],
  ["back", "rail", { type: "back" }],
  ["viewChanged to Today", "hidden", ON_TODAY],
  ["viewChanged to Today", "rail", ON_TODAY],
  ["viewChanged to Calendar", "rail", ON_CALENDAR],
] as const satisfies readonly (readonly [string, SidebarMode, SidebarAction])[])(
  "SHELL-08 %s leaves a %s sidebar as it is",
  (_name, mode, action) => {
    const state = { mode };

    expect(sidebarReducer(state, action)).toBe(state);
  },
);

test.each([
  ["rail", "hidden"],
  ["expanded", "hidden"],
] as const satisfies readonly (readonly [SidebarMode, SidebarMode])[])(
  "SHELL-11 idle turns %s into %s",
  (from, to) => {
    expect(sidebarReducer({ mode: from }, { type: "idle" })).toEqual({ mode: to });
  },
);

test("SHELL-11 idle leaves a hidden sidebar as it is", () => {
  const state = { mode: "hidden" } as const;

  expect(sidebarReducer(state, { type: "idle" })).toBe(state);
});

test.each([
  [undefined, "today", "hidden"],
  [undefined, "calendar", "rail"],
  [undefined, "settings", "rail"],
  ["1", "today", "rail"],
  ["open", "today", "expanded"],
  ["open", "calendar", "expanded"],
] as const)("SHELL-08 rail=%s on %s starts the sidebar %s", (rail, view, mode) => {
  expect(initialSidebar(rail, view)).toEqual({ mode });
});

test.each([
  ["hidden", "calendar", 36],
  ["hidden", "today", 0],
  ["rail", "calendar", 80],
  ["rail", "today", 80],
  ["expanded", "calendar", 332],
  ["expanded", "today", 332],
] as const)("SHELL-10 a %s sidebar on %s insets the page by %i px", (mode, view, inset) => {
  expect(sidebarInset(mode, view, false)).toBe(inset);
});

const SMALL = { small: true } as const;

test.each([
  ["show", "hidden", "expanded", { type: "show", ...SMALL }],
  ["close", "expanded", "hidden", { type: "close" }],
  ["back", "expanded", "hidden", { type: "back", ...SMALL }],
  ["viewChanged to Calendar", "expanded", "hidden", { ...ON_CALENDAR, ...SMALL }],
  ["viewChanged to Today", "expanded", "hidden", { ...ON_TODAY, ...SMALL }],
] as const satisfies readonly (readonly [string, SidebarMode, SidebarMode, SidebarAction])[])(
  "SHELL-08 on small %s turns %s into %s and never reaches Rail",
  (_name, from, to, action) => {
    expect(sidebarReducer({ mode: from }, action)).toEqual({ mode: to });
  },
);

test.each([
  ["hidden", "viewChanged to Calendar", { ...ON_CALENDAR, ...SMALL }],
  ["hidden", "viewChanged to Today", { ...ON_TODAY, ...SMALL }],
  ["hidden", "back", { type: "back", ...SMALL }],
  ["expanded", "show", { type: "show", ...SMALL }],
] as const satisfies readonly (readonly [SidebarMode, string, SidebarAction])[])(
  "SHELL-08 on small a %s sidebar stays as it is on %s",
  (mode, _name, action) => {
    const state = { mode };

    expect(sidebarReducer(state, action)).toBe(state);
  },
);

test.each([
  [undefined, "today", "hidden"],
  [undefined, "calendar", "hidden"],
  ["1", "calendar", "hidden"],
  ["open", "calendar", "expanded"],
] as const)("SHELL-08 on small rail=%s on %s starts the sidebar %s", (rail, view, mode) => {
  expect(initialSidebar(rail, view, true)).toEqual({ mode });
});

test.each([
  ["hidden", "calendar", 24],
  ["hidden", "today", 0],
  ["expanded", "calendar", 24],
  ["expanded", "today", 0],
] as const)(
  "SHELL-10 on small a %s sidebar on %s insets the page by %i px",
  (mode, view, inset) => {
    expect(sidebarInset(mode, view, true)).toBe(inset);
  },
);
