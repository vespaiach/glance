import type { CalendarEvent, Tag, TagColor, Weather, WeatherIcon } from "@/domain/schemas";
import { octoberAt } from "./samples";

type Who = readonly number[] | "everyone";

type Hour = readonly [icon: WeatherIcon, temp: number, precip?: number];

const FAMILY: readonly (readonly [string, TagColor])[] = [
  ["Minh-An", "lilac"],
  ["Minh-Hy", "sky"],
  ["Mom", "coral"],
  ["Dad", "mint"],
  ["Thang", "sun"],
  ["Tin", "pink"],
  ["Nghe", "lime"],
  ["An", "rust"],
  ["Nga", "glacier"],
];

const [AN, HY, MOM, DAD, THANG, TIN, NGHE, AN2, NGA] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const timelineId = (n: number) => `0195f0a0-0000-7000-8000-0000000007${String(n).padStart(2, "0")}`;

export const TIMELINE_FAMILY: readonly Tag[] = FAMILY.map(([name, color], index) => ({
  id: timelineId(index + 1),
  name,
  color,
  createdAt: `2026-10-01T16:0${index}:00.000Z`,
}));

const tagIds = (who: readonly number[]) => who.map((index) => TIMELINE_FAMILY[index]?.id ?? "");

const plan = (
  n: number,
  [day, start, end]: readonly [number, number, number],
  [title, location]: readonly [string, string],
  who: Who,
  notes?: string,
): CalendarEvent => ({
  id: timelineId(20 + n),
  title,
  location,
  startAt: octoberAt(day, 0, start).toISOString(),
  endAt: octoberAt(day, 0, end).toISOString(),
  notify: true,
  ...(who === "everyone"
    ? { everyone: true, tagIds: [] }
    : { everyone: false, tagIds: tagIds(who) }),
  ...(notes !== undefined && { notes }),
});

const SCHOOL = "Lincoln Elementary";

export const OCT_9_PLANS: readonly CalendarEvent[] = [
  plan(1, [9, 465, 495], ["School drop-off", SCHOOL], [DAD, AN, HY], "Bring library books"),
  plan(2, [9, 630, 675], ["Grandma’s video call", "Living room"], [MOM]),
  plan(3, [9, 720, 780], ["Lunch with Aunt Rosa", "Café Lumen"], [MOM]),
  plan(4, [9, 840, 870], ["Dentist", "Dr. Patel"], [MOM, AN], "Bring insurance card"),
  plan(5, [9, 930, 990], ["Soccer practice", "Laurelhurst Park"], [HY, DAD]),
  plan(6, [9, 495, 900], ["School", SCHOOL], [AN, HY]),
  plan(7, [9, 900, 915], ["School pickup", SCHOOL], [DAD, AN, HY]),
  plan(8, [9, 810, 870], ["Car service", "Westside Auto"], [DAD], "Bring spare key"),
  plan(9, [9, 1020, 1065], ["Piano lesson", "Ms. Tran’s studio"], [AN, MOM]),
  plan(10, [9, 1140, 1230], ["Movie night", "Living room"], "everyone"),
  plan(11, [9, 420, 465], ["Morning run", "Laurelhurst Park"], [THANG]),
  plan(12, [9, 570, 630], ["Physical therapy", "Eastside Clinic"], [TIN]),
  plan(13, [9, 600, 660], ["Yoga class", "Studio 7"], [NGA], "Bring yoga mat"),
  plan(14, [9, 660, 780], ["Volunteer shift", "Food bank"], [NGHE], "Bring name badge"),
  plan(15, [9, 780, 825], ["Haircut", "Salon Lumi"], [AN2]),
  plan(16, [9, 960, 1020], ["Chess club", "Belmont Library"], [TIN]),
  plan(17, [9, 990, 1005], ["Soccer pickup", "Laurelhurst Park"], [NGA, HY]),
  plan(18, [9, 1080, 1125], ["Pick up groceries", "Fred Meyer"], [THANG]),
];

export const OCT_10_PLANS: readonly CalendarEvent[] = [
  plan(
    30,
    [10, 420, 660],
    ["Fishing trip", "Sauvie Island"],
    [THANG, TIN],
    "Bring fishing license",
  ),
  plan(31, [10, 540, 630], ["Soccer game", "Laurelhurst Park"], [HY, DAD, MOM, AN, NGA]),
  plan(32, [10, 660, 720], ["Farmers market", "Shemanski Park"], [DAD]),
  plan(33, [10, 270, 315], ["Pick up bait", "Fish & Tackle"], [THANG]),
  plan(34, [10, 1320, 1410], ["Late movie", "Hollywood Theatre"], [AN, HY]),
  plan(
    35,
    [10, 840, 960],
    ["Sophie’s birthday party", "Bounce Town"],
    [AN, MOM],
    "Bring gift for Sophie",
  ),
];

export const MOM_AND_DAD = new Set([MOM, DAD].map((index) => TIMELINE_FAMILY[index]?.id ?? ""));

const HOURS: Record<9 | 10, readonly Hour[]> = {
  9: [
    ["cloud", 52],
    ["cloud", 55],
    ["cloud-sun", 58],
    ["cloud-sun", 62],
    ["cloud-sun", 64],
    ["cloud-sun", 66],
    ["cloud", 67],
    ["cloud", 68],
    ["cloud-drizzle", 65, 40],
    ["cloud-rain", 61, 80],
    ["cloud-rain", 58, 70],
    ["cloud", 56],
    ["cloud", 54],
    ["cloud", 53],
  ],
  10: [
    ["cloud", 48],
    ["cloud-drizzle", 50, 40],
    ["cloud-rain", 52, 70],
    ["cloud-rain", 54, 80],
    ["cloud-rain", 56, 80],
    ["cloud-rain", 57, 70],
    ["cloud-drizzle", 58, 50],
    ["cloud", 59],
    ["cloud", 59],
    ["cloud", 58],
    ["cloud", 56],
    ["cloud", 54],
    ["cloud", 52],
    ["cloud", 50],
  ],
};

const FIRST_HOUR = 7;

export const hourlyOn = (day: 9 | 10) =>
  HOURS[day].map(([icon, temp, precip], index) => ({
    time: octoberAt(day, FIRST_HOUR + index).toISOString(),
    icon,
    temp,
    ...(precip !== undefined && { precip }),
  })) as Weather["hourly"];
