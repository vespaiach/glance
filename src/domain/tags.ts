import { type Tag, type TagColor, TagColorSchema } from "./schemas";

export type EventWho = { everyone: boolean; tagIds: readonly string[] };

export type TagFilter = "all" | ReadonlySet<string>;

export const EVERYONE: EventWho = { everyone: true, tagIds: [] };

export function whoLabel(event: EventWho, tags: readonly Tag[], everyoneLabel: string) {
  if (event.everyone) return everyoneLabel;

  return tags
    .filter((tag) => event.tagIds.includes(tag.id))
    .map((tag) => tag.name)
    .join(", ");
}

export function eventColor(event: EventWho, tags: readonly Tag[]): TagColor | "soft" {
  const [only, ...others] = event.tagIds;

  if (only === undefined || others.length > 0) return "soft";

  return tags.find((tag) => tag.id === only)?.color ?? "soft";
}

export function nextFreeColor(tags: readonly Tag[]): TagColor {
  const used = new Set(tags.map((tag) => tag.color));

  const [first] = TagColorSchema.options;

  return TagColorSchema.options.find((color) => !used.has(color)) ?? first;
}

export function toggleWho(who: EventWho, tagId: string, allIds: readonly string[]): EventWho {
  const selected = allIds.filter(
    (id) => (who.everyone || who.tagIds.includes(id)) !== (id === tagId),
  );

  return selected.length === allIds.length ? EVERYONE : { everyone: false, tagIds: selected };
}

export function matchesFilter(
  event: EventWho,
  selected: ReadonlySet<string>,
  allIds: readonly string[],
): boolean {
  if (allIds.every((id) => selected.has(id))) return true;

  if (event.everyone) return selected.size > 0;

  return event.tagIds.some((id) => selected.has(id));
}

export function toggleFilter(
  selected: ReadonlySet<string>,
  tagId: string,
  allIds: readonly string[],
): TagFilter {
  const next = new Set(selected);

  if (next.has(tagId)) next.delete(tagId);
  else next.add(tagId);

  return allIds.every((id) => next.has(id)) ? "all" : next;
}

export function liveFilter(filter: TagFilter, allIds: readonly string[]): ReadonlySet<string> {
  if (filter === "all") return new Set(allIds);

  return new Set(allIds.filter((id) => filter.has(id)));
}

export function filterTagIds(selected: ReadonlySet<string>, allIds: readonly string[]): EventWho {
  if (allIds.every((id) => selected.has(id))) return EVERYONE;

  return { everyone: false, tagIds: allIds.filter((id) => selected.has(id)) };
}
