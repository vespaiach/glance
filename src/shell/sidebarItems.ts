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
import { type View, viewPath } from "./routes";

export type SidebarItem = {
  key: View | "ambient";
  icon: LucideIcon;
  name: string;
  label: string;
  path: string;
};

function viewItem(key: Exclude<View, "settings">, icon: LucideIcon): SidebarItem {
  const label = copy.nav.view[key];

  return { key, icon, name: label, label, path: viewPath(key) };
}

export const SIDEBAR_VIEWS: readonly SidebarItem[] = [
  viewItem("today", House),
  viewItem("calendar", CalendarDays),
  viewItem("weather", CloudSun),
  viewItem("notes", StickyNote),
  viewItem("photos", Image),
];

export const SIDEBAR_PINNED: readonly SidebarItem[] = [
  {
    key: "ambient",
    icon: Moon,
    name: copy.nav.ambientScreen,
    label: copy.nav.ambient,
    path: "/ambient",
  },
  {
    key: "settings",
    icon: Settings,
    name: copy.nav.view.settings,
    label: copy.nav.view.settings,
    path: viewPath("settings"),
  },
];
