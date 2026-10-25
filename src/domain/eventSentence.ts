import type { Tag } from "./schemas";

export type EventWord = "title" | "day" | "start" | "end" | "who" | "where" | "notes";

export type SentenceWord = Exclude<EventWord, "notes">;

export type DefaultWord = "day" | "start" | "end" | "who";

export type SentenceJoin = "on" | "from" | "at" | "to" | "for" | "comma" | "commaFor";

export type SentenceToken = { word: SentenceWord; join: SentenceJoin | null };

export type SentenceShape = { allDay?: boolean; hasEnd: boolean; hasPlace: boolean; view: boolean };

export type WordShape = Pick<SentenceShape, "allDay" | "hasEnd">;

export type WhoText =
  | { kind: "everyone" }
  | { kind: "nobody" }
  | { kind: "people"; names: string[]; others: number };

const WORD_ORDER: readonly EventWord[] = ["title", "day", "start", "end", "who", "where", "notes"];

const NAMED_WHEN_SHORT = 3;

const NAMED_WHEN_LONG = 2;

export function sentenceTokens(shape: SentenceShape): SentenceToken[] {
  const timed = !shape.allDay;

  const tokens: (SentenceToken | false)[] = [
    { word: "title", join: null },
    { word: "day", join: "on" },
    { word: "start", join: startJoin(shape) },
    timed && shape.hasEnd && { word: "end", join: "to" },
    { word: "who", join: timed ? "for" : "commaFor" },
    (shape.hasPlace || !shape.view) && { word: "where", join: "at" },
  ];

  return tokens.filter((token) => token !== false);
}

export function nextWord(word: EventWord, shape: WordShape): EventWord | undefined {
  const order = hasEndWord(shape) ? WORD_ORDER : WORD_ORDER.filter((one) => one !== "end");

  return order[order.indexOf(word) + 1];
}

export function isPlaceholder(
  word: SentenceWord,
  draft: { title: string; location: string },
  touched: readonly DefaultWord[],
): boolean {
  if (word === "title") return draft.title.trim() === "";

  if (word === "where") return draft.location.trim() === "";

  return !touched.includes(word);
}

export function whoText(
  tagIds: readonly string[],
  tags: readonly Tag[],
  maxNamed = NAMED_WHEN_SHORT,
): WhoText {
  const names = tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name);

  if (names.length === 0) return { kind: "nobody" };

  if (names.length === tags.length) return { kind: "everyone" };

  if (names.length <= maxNamed) return { kind: "people", names, others: 0 };

  return {
    kind: "people",
    names: names.slice(0, NAMED_WHEN_LONG),
    others: names.length - NAMED_WHEN_LONG,
  };
}

function startJoin({ allDay, hasEnd }: SentenceShape): SentenceJoin {
  if (allDay) return "comma";

  return hasEnd ? "from" : "at";
}

function hasEndWord({ allDay, hasEnd }: WordShape): boolean {
  return !allDay && hasEnd;
}
