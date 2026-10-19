import { type Member, type MemberColor, MemberColorSchema } from "./schemas";

export type EventWho = { everyone: boolean; memberIds: readonly string[] };

export type MemberFilter = "everyone" | ReadonlySet<string>;

export type RemovalImpact<T> = { solo: T[]; shared: T[] };

export function whoLabel(event: EventWho, members: readonly Member[], everyoneLabel: string) {
  if (event.everyone) return everyoneLabel;

  return members
    .filter((member) => event.memberIds.includes(member.id))
    .map((member) => member.name)
    .join(", ");
}

export function eventColor(event: EventWho, members: readonly Member[]): MemberColor | "soft" {
  const [only, ...others] = event.memberIds;

  if (only === undefined || others.length > 0) return "soft";

  return members.find((member) => member.id === only)?.color ?? "soft";
}

export function removalImpact<T extends EventWho>(
  memberId: string,
  events: readonly T[],
): RemovalImpact<T> {
  const theirs = events.filter((event) => !event.everyone && event.memberIds.includes(memberId));

  return {
    solo: theirs.filter((event) => event.memberIds.length === 1),
    shared: theirs.filter((event) => event.memberIds.length > 1),
  };
}

export function withoutMember<T extends EventWho>(event: T, memberId: string): T {
  return { ...event, memberIds: event.memberIds.filter((id) => id !== memberId) };
}

export function nextFreeColor(members: readonly Member[]): MemberColor {
  const used = new Set(members.map((member) => member.color));

  const [first] = MemberColorSchema.options;

  return MemberColorSchema.options.find((color) => !used.has(color)) ?? first;
}

export function matchesFilter(event: EventWho, filter: MemberFilter): boolean {
  if (filter === "everyone" || event.everyone) return true;

  return event.memberIds.some((id) => filter.has(id));
}
