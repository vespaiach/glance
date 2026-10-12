import type { Season } from "@/domain/schemas";

export const copy = {
  appName: "Glance",
  season: {
    spring: "Spring",
    summer: "Summer",
    fall: "Fall",
    winter: "Winter",
  } satisfies Record<Season, string>,
  notes: {
    guestAuthor: "Guest",
  },
} as const;
