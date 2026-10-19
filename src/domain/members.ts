import { type Member, type MemberColor, MemberColorSchema } from "./schemas";

export type EventWho = { everyone: boolean; memberIds: readonly string[] };

export type MemberFilter = "everyone" | ReadonlySet<string>;

export type RemovalImpact<T> = { solo: T[]; shared: T[] };

export type MemberNameError = "empty" | "taken";

export const EVERYONE: EventWho = { everyone: true, memberIds: [] };

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

export function freeColors(members: readonly Member[]): MemberColor[] {
  const used = new Set(members.map((member) => member.color));

  const free = MemberColorSchema.options.filter((color) => !used.has(color));

  return free.length > 0 ? free : [...MemberColorSchema.options];
}

export function memberNameError(
  name: string,
  members: readonly Pick<Member, "name">[],
): MemberNameError | null {
  const wanted = name.trim().toLowerCase();

  if (wanted === "") return "empty";

  return members.some((member) => member.name.trim().toLowerCase() === wanted) ? "taken" : null;
}

export function toggleWho(who: EventWho, memberId: string, family: readonly string[]): EventWho {
  const selected = family.filter(
    (id) => (who.everyone || who.memberIds.includes(id)) !== (id === memberId),
  );

  if (selected.length === 0) return who;

  return selected.length === family.length ? EVERYONE : { everyone: false, memberIds: selected };
}

export function whoFromFilter(memberIds: readonly string[] | undefined): EventWho {
  if (memberIds === undefined || memberIds.length === 0) return EVERYONE;

  return { everyone: false, memberIds };
}

export function matchesFilter(event: EventWho, filter: MemberFilter): boolean {
  if (filter === "everyone") return true;

  if (filter.size === 0) return false;

  return event.everyone || event.memberIds.some((id) => filter.has(id));
}

export function toggleFilter(
  filter: MemberFilter,
  memberId: string,
  family: readonly string[],
): MemberFilter {
  const selected = filter === "everyone" ? new Set<string>() : new Set(filter);

  if (selected.has(memberId)) selected.delete(memberId);
  else selected.add(memberId);

  return family.every((id) => selected.has(id)) ? "everyone" : selected;
}

export function filterMemberIds(
  filter: MemberFilter,
  family: readonly string[],
): string[] | undefined {
  if (filter === "everyone" || filter.size === 0) return undefined;

  return family.filter((id) => filter.has(id));
}

export function liveFilter(filter: MemberFilter, familyIds: readonly string[]): MemberFilter {
  if (filter === "everyone") return filter;

  const live = [...filter].filter((id) => familyIds.includes(id));

  if (live.length === filter.size) return filter;

  return live.length === 0 ? "everyone" : new Set(live);
}
