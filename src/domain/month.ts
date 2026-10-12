const monthYearFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

const initialFormat = new Intl.DateTimeFormat("en-US", { weekday: "narrow" });

const WEEK = 7;

const A_SUNDAY = new Date(2026, 9, 4);

export function monthCells(year: number, month: number): (number | null)[] {
  const leading = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();
  const trailing = (WEEK - ((leading + length) % WEEK)) % WEEK;

  const days = Array.from({ length }, (_, index) => index + 1);

  return [...Array(leading).fill(null), ...days, ...Array(trailing).fill(null)];
}

export function formatMonthYear(year: number, month: number): string {
  return monthYearFormat.format(new Date(year, month, 1));
}

export function weekdayInitials(): string[] {
  return Array.from({ length: WEEK }, (_, offset) =>
    initialFormat.format(
      new Date(A_SUNDAY.getFullYear(), A_SUNDAY.getMonth(), A_SUNDAY.getDate() + offset),
    ),
  );
}
