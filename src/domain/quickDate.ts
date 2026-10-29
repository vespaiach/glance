import { addDays, dateKey, parseDateKey } from "./zone";

const monthYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function monthTitle(month: string): string {
  return monthYear.format(parseDateKey(`${month}-01`));
}

export function stepMonth(month: string, delta: -1 | 1): string {
  const first = parseDateKey(`${month}-01`);

  return monthOf(dateKey(new Date(first.setUTCMonth(first.getUTCMonth() + delta)), "UTC"));
}

export function monthCells(month: string): (string | null)[] {
  const first = `${month}-01`;

  const length = new Date(Date.UTC(...yearMonth(month), 0)).getUTCDate();

  const padding = Array.from<null>({ length: parseDateKey(first).getUTCDay() }).fill(null);

  return [...padding, ...Array.from({ length }, (_, offset) => addDays(first, offset))];
}

function yearMonth(month: string): [number, number] {
  const [year = 1970, number = 1] = month.split("-").map(Number);

  return [year, number];
}
