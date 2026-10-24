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
  ["today", "hidden"],
  ["calendar", "rail"],
  ["settings", "rail"],
] as const)("SHELL-08 on %s the sidebar starts %s", (view, mode) => {
  expect(initialSidebar(view)).toEqual({ mode });
});

test.each([
  ["hidden", 36],
  ["rail", 80],
  ["expanded", 332],
] as const)("SHELL-10 a %s sidebar insets the page by %i px", (mode, inset) => {
  expect(sidebarInset(mode, false)).toBe(inset);
});

test("SHELL-08 Today gets the grip pad while the sidebar is hidden, like every view", () => {
  expect(sidebarInset(initialSidebar("today").mode, false)).toBe(36);
  expect(sidebarInset(initialSidebar("today", true).mode, true)).toBe(24);
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

test.each(["today", "calendar"] as const)(
  "SHELL-08 on small %s starts the sidebar hidden",
  (view) => {
    expect(initialSidebar(view, true)).toEqual({ mode: "hidden" });
  },
);

test.each(["hidden", "expanded"] as const)(
  "SHELL-10 on small a %s sidebar insets the page by the 24 px grip pad",
  (mode) => {
    expect(sidebarInset(mode, true)).toBe(24);
  },
);
