import {
  initialSidebar,
  type SidebarAction,
  type SidebarMode,
  sidebarInset,
  sidebarReducer,
} from "./sidebar";

test.each([
  ["show", "hidden", "rail"],
  ["open", "rail", "expanded"],
  ["close", "expanded", "hidden"],
  ["back", "expanded", "rail"],
  ["viewChanged", "expanded", "rail"],
] as const)("SHELL-08 %s turns %s into %s", (type, from, to) => {
  expect(sidebarReducer({ mode: from }, { type })).toEqual({ mode: to });
});

test.each([
  ["show", "rail"],
  ["show", "expanded"],
  ["open", "hidden"],
  ["open", "expanded"],
  ["close", "hidden"],
  ["close", "rail"],
  ["back", "hidden"],
  ["back", "rail"],
  ["viewChanged", "hidden"],
  ["viewChanged", "rail"],
] as const satisfies readonly (readonly [SidebarAction["type"], SidebarMode])[])(
  "SHELL-08 %s leaves a %s sidebar as it is",
  (type, mode) => {
    const state = { mode };

    expect(sidebarReducer(state, { type })).toBe(state);
  },
);

test.each([
  [undefined, "hidden"],
  ["1", "rail"],
  ["open", "expanded"],
] as const)("SHELL-08 rail=%s starts the sidebar %s", (rail, mode) => {
  expect(initialSidebar(rail)).toEqual({ mode });
});

test.each([
  ["hidden", 0],
  ["rail", 80],
  ["expanded", 332],
] as const)("SHELL-10 a %s sidebar insets the page by %i px", (mode, inset) => {
  expect(sidebarInset(mode)).toBe(inset);
});
