const RECENT_TITLES = 6;

const RECENT_PLACES = 5;

type Changed = { title: string; location?: string; updatedAt: string };

export function recentTitles(events: readonly Changed[]): string[] {
  return recentValues(
    events.map((event) => [event.title, event.updatedAt]),
    RECENT_TITLES,
  );
}

export function recentPlaces(events: readonly Changed[]): string[] {
  return recentValues(
    events.map((event) => [event.location ?? "", event.updatedAt]),
    RECENT_PLACES,
  );
}

function recentValues(values: [string, string][], max: number): string[] {
  const newestFirst = values.toSorted(([, a], [, b]) => b.localeCompare(a));

  const seen = new Map<string, string>();

  for (const [value] of newestFirst) addDistinct(seen, value.trim());

  return [...seen.values()].slice(0, max);
}

function addDistinct(seen: Map<string, string>, value: string) {
  const key = value.toLowerCase();

  if (value !== "" && !seen.has(key)) seen.set(key, value);
}
