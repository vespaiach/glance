import { copy } from "@/copy";
import type { WmoCondition } from "@/domain/wmo";

export function conditionText(condition: string): string {
  return Object.hasOwn(copy.weather.condition, condition)
    ? copy.weather.condition[condition as WmoCondition]
    : condition;
}
