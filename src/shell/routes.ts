export const VIEWS = ["today", "calendar", "weather", "notes", "photos", "settings"] as const;

export type View = (typeof VIEWS)[number];

export function viewPath(view: View): string {
  return `/${view}`;
}

export function viewForPath(pathname: string): View | undefined {
  const [, segment] = pathname.split("/");

  return VIEWS.find((view) => view === segment);
}
