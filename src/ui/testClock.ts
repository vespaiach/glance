import type { MatcherFunction } from "@testing-library/react";

export function clockTime(text: string): MatcherFunction {
  return (_content, element) =>
    element?.textContent === text &&
    [...element.children].every((child) => child.textContent !== text);
}
