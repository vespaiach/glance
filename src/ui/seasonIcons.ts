import { Flower2, Leaf, type LucideIcon, Snowflake, Sun } from "lucide-react";
import type { Season } from "@/domain/schemas";

export const seasonIcons: Record<Season, LucideIcon> = {
  spring: Flower2,
  summer: Sun,
  fall: Leaf,
  winter: Snowflake,
};
