import type { FixtureParams } from "@/data/repos";
import { liveFilter, type MemberFilter, toggleFilter } from "@/domain/members";
import { stepWeek } from "@/domain/week";

export type CalendarView = {
  day: string | undefined;
  filter: MemberFilter;
  span24: boolean;
};

export type CalendarViewAction =
  | { type: "select"; day: string }
  | { type: "step"; delta: -1 | 1; today: string }
  | { type: "toggleMember"; id: string; family: readonly string[] }
  | { type: "toggleSpan" };

type CalendarStart = {
  date?: string;
  fixture?: Pick<FixtureParams, "day" | "who" | "span24">;
};

export function initialCalendarView({ date, fixture = {} }: CalendarStart): CalendarView {
  return {
    day: date ?? fixture.day,
    filter: fixture.who ? new Set(fixture.who) : "everyone",
    span24: fixture.span24 === true,
  };
}

export function calendarView(state: CalendarView, action: CalendarViewAction): CalendarView {
  switch (action.type) {
    case "select":
      return { ...state, day: action.day };
    case "step":
      return { ...state, day: stepWeek(state.day ?? action.today, action.delta, action.today) };
    case "toggleMember":
      return {
        ...state,
        filter: toggleFilter(liveFilter(state.filter, action.family), action.id, action.family),
      };
    case "toggleSpan":
      return { ...state, span24: !state.span24 };
  }
}
