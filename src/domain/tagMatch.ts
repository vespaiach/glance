import type { Tag } from "./schemas";

const TYPO_MIN = 3;

const SEPARATORS = /[\s-]+/;

export function suggestTags(
  tags: readonly Tag[],
  input: string,
  exclude: readonly string[],
): Tag[] {
  const query = fold(input);

  if (query === "") return [];

  return tags
    .filter((tag) => !exclude.includes(tag.id))
    .flatMap((tag) => ranked(tag, query))
    .sort((a, b) => a.tier - b.tier)
    .map(({ tag }) => tag);
}

function ranked(tag: Tag, query: string) {
  const tier = matchTier(tag.name, query);

  return tier === undefined ? [] : [{ tag, tier }];
}

function matchTier(name: string, query: string): number | undefined {
  const folded = fold(name);

  const tiers = [
    folded.startsWith(query),
    name.split(SEPARATORS).some((word) => fold(word).startsWith(query)),
    folded.includes(query),
    inOrder(folded, query),
    query.length >= TYPO_MIN && oneTypo(folded, query),
  ];

  const tier = tiers.indexOf(true);

  return tier === -1 ? undefined : tier;
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/giu, "d")
    .toLowerCase()
    .replace(/[\s-]/g, "");
}

function inOrder(name: string, query: string): boolean {
  let next = 0;

  for (const letter of name) if (letter === query[next]) next += 1;

  return next === query.length;
}

function oneTypo(name: string, query: string): boolean {
  return withinOneEdit(query, name.slice(0, query.length)) || withinOneEdit(query, name);
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;

  const [short, long] = a.length <= b.length ? [a, b] : [b, a];

  const first = [...short].findIndex((letter, index) => letter !== long[index]);

  if (first === -1) return true;

  const skip = short.length === long.length ? 1 : 0;

  return short.slice(first + skip) === long.slice(first + 1);
}
