import { calendarView, initialCalendarView } from "./calendarView";

const TODAY = "2026-10-09";

const START = initialCalendarView({});

describe("initialCalendarView", () => {
  it("CAL-06 opens on today with 24 hours off", () => {
    expect(START).toEqual({ day: undefined, span24: false, picker: false });
  });

  it("CAL-04 ?date= selects that day, ahead of the day= fixture", () => {
    expect(initialCalendarView({ date: "2026-10-14", fixture: { day: "2026-10-10" } }).day).toBe(
      "2026-10-14",
    );
    expect(initialCalendarView({ fixture: { day: "2026-10-10" } }).day).toBe("2026-10-10");
  });

  it("CAL-06 span=24 turns 24 hours on", () => {
    expect(initialCalendarView({ fixture: { span24: true } }).span24).toBe(true);
  });
});

describe("calendarView", () => {
  it("CAL-03 dp=open starts with the date picker open", () => {
    expect(initialCalendarView({ fixture: { dp: "open" } }).picker).toBe(true);
  });

  it("CAL-03 picking a day selects it and closes the picker", () => {
    const open = calendarView(START, { type: "openPicker" });

    expect(open.picker).toBe(true);

    const picked = calendarView(open, { type: "select", day: "2026-11-02" });

    expect(picked).toMatchObject({ day: "2026-11-02", picker: false });
  });

  it("CAL-03 closing the picker keeps the selected day", () => {
    const open = calendarView({ ...START, day: "2026-10-14" }, { type: "openPicker" });

    expect(calendarView(open, { type: "closePicker" })).toMatchObject({
      day: "2026-10-14",
      picker: false,
    });
  });

  it("CAL-01 selecting a day selects it", () => {
    expect(calendarView(START, { type: "select", day: "2026-10-14" }).day).toBe("2026-10-14");
  });

  it("CAL-02 stepping from today selects the next week's Sunday", () => {
    expect(calendarView(START, { type: "step", delta: 1, today: TODAY }).day).toBe("2026-10-11");
  });

  it("CAL-06 24 hours stays on across days", () => {
    const on = calendarView(START, { type: "toggleSpan" });

    expect(on.span24).toBe(true);
    expect(calendarView(on, { type: "select", day: "2026-10-14" }).span24).toBe(true);
    expect(calendarView(on, { type: "toggleSpan" }).span24).toBe(false);
  });
});
