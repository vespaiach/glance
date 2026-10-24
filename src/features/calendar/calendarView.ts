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

export function initialCalendarView(date: string | undefined): CalendarView {
  return { day: date, span24: false, picker: false };
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
