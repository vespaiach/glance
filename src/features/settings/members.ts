import { copy } from "@/copy";
import type { Tag } from "@/domain/schemas";
import { type EventWho, memberRemoval, removalLine } from "@/domain/tags";
import type { Member } from "./components/MemberList";

type MemberEvent = EventWho & { id: string; deletedAt?: string };

export function members(tags: readonly Tag[], events: readonly MemberEvent[]): Member[] {
  return tags.map((tag) => member(tag, events));
}

function member(tag: Tag, events: readonly MemberEvent[]): Member {
  const removal = memberRemoval(events, tag.id);

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    plans: removal.deleted.length + removal.stripped.length,
    result: removalLine(removal, copy.tags.removal),
  };
}
