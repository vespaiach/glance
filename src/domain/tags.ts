import { type Tag, type TagColor, TagColorSchema } from "./schemas";

export type EventWho = { everyone: boolean; tagIds: readonly string[] };

export type TagFilter = "all" | ReadonlySet<string>;

export type FilterLabels = {
  everyone: string;
  nobody: string;
  people: (count: number) => string;
};

export type StackCircles = { shown: readonly Tag[]; more: number };

export const EVERYONE: EventWho = { everyone: true, tagIds: [] };

const WORD_BREAK = /[\s-]+/;

const SHORT_NAME = 3;

const NAMED_PEOPLE = 2;

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

export function toggleEveryone(
  selected: ReadonlySet<string>,
  allIds: readonly string[],
): TagFilter {
  return allIds.every((id) => selected.has(id)) ? new Set() : "all";
}

export function filterLabel(
  selected: ReadonlySet<string>,
  tags: readonly Tag[],
  labels: FilterLabels,
): string {
  const shown = tags.filter((tag) => selected.has(tag.id));

  if (shown.length === 0) return labels.nobody;

  if (shown.length === tags.length) return labels.everyone;

  if (shown.length > NAMED_PEOPLE) return labels.people(shown.length);

  return shown.map((tag) => tag.name).join(", ");
}

export function initials(name: string): string {
  const letters = Array.from(name.trim());

  if (letters.length <= SHORT_NAME) return letters.join("");

  const [first, second] = name.trim().split(WORD_BREAK);

  if (first && second) return `${firstLetter(first)}${firstLetter(second)}`.toUpperCase();

  return letters.slice(0, 2).join("");
}

export function stackCircles(shown: readonly Tag[], max: number): StackCircles {
  if (shown.length <= max) return { shown, more: 0 };

  return { shown: shown.slice(0, max - 1), more: shown.length - (max - 1) };
}

export function liveFilter(filter: TagFilter, allIds: readonly string[]): ReadonlySet<string> {
  if (filter === "all") return new Set(allIds);

  return new Set(allIds.filter((id) => filter.has(id)));
}

export function filterTagIds(selected: ReadonlySet<string>, allIds: readonly string[]): EventWho {
  if (allIds.every((id) => selected.has(id))) return EVERYONE;

  return { everyone: false, tagIds: allIds.filter((id) => selected.has(id)) };
}

export function filterScope(
  selected: ReadonlySet<string>,
  allIds: readonly string[],
): "everyone" | "some" | "none" {
  const who = filterTagIds(selected, allIds);

  if (who.everyone) return "everyone";

  return who.tagIds.length === 0 ? "none" : "some";
}

export function whoValue(ids: readonly string[], allIds: readonly string[]): EventWho {
  if (allIds.every((id) => ids.includes(id))) return EVERYONE;

  return { everyone: false, tagIds: [...ids] };
}

export function whoIds(event: EventWho, allIds: readonly string[]): readonly string[] {
  return event.everyone ? allIds : event.tagIds;
}

export function pickWho(
  tagIds: readonly string[],
  allIds: readonly string[],
  tagId?: string,
): string[] {
  if (tagId === undefined) return [...allIds];

  if (allIds.every((id) => tagIds.includes(id))) return [tagId];

  const next = tagIds.includes(tagId) ? tagIds.filter((id) => id !== tagId) : [...tagIds, tagId];

  return next.length === 0 ? [...allIds] : allIds.filter((id) => next.includes(id));
}

export function exactTag(tags: readonly Tag[], input: string): Tag | undefined {
  const name = input.trim().toLowerCase();

  return tags.find((tag) => tag.name.toLowerCase() === name);
}

function firstLetter(word: string): string {
  return Array.from(word)[0] ?? "";
}
