import type { FixtureParams } from "@/data/repos";
import { stepWeek } from "@/domain/week";

export type CalendarView = {
  day: string | undefined;
  span24: boolean;
  picker: boolean;
};

export type CalendarViewAction =
  | { type: "select"; day: string }
  | { type: "step"; delta: -1 | 1; today: string }
  | { type: "toggleSpan" }
  | { type: "openPicker" }
  | { type: "closePicker" };

type CalendarStart = {
  date?: string;
  fixture?: Pick<FixtureParams, "day" | "span24" | "dp">;
};

export function initialCalendarView({ date, fixture = {} }: CalendarStart): CalendarView {
  return {
    day: date ?? fixture.day,
    span24: fixture.span24 === true,
    picker: fixture.dp === "open",
  };
}

export function calendarView(state: CalendarView, action: CalendarViewAction): CalendarView {
  switch (action.type) {
    case "select":
      return { ...state, day: action.day, picker: false };
    case "step":
      return { ...state, day: stepWeek(state.day ?? action.today, action.delta, action.today) };
    case "toggleSpan":
      return { ...state, span24: !state.span24 };
    case "openPicker":
      return { ...state, picker: true };
    case "closePicker":
      return { ...state, picker: false };
  }
}
