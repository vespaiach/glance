import "server-only";
import { allDayStart } from "@/domain/allDay";
import { uuidv7 } from "@/domain/id";
import type { CalendarEvent, Note, Tag, TagColor, WeatherLocation } from "@/domain/schemas";
import { addDays, calendarDate, dateKey, parseDateKey, zonedInstant } from "@/domain/zone";

export const GUEST_NAME = "Trinh";

export const GUEST_TIME_ZONE = "America/Indiana/Indianapolis";

export const GUEST_PLACE: WeatherLocation = {
  name: "Carmel",
  region: "Indiana",
  lat: 39.9784,
  lon: -86.118,
  timeZone: GUEST_TIME_ZONE,
};

export type GuestFamily = { tags: Tag[]; events: CalendarEvent[]; notes: Note[] };

const FAMILY = [
  ["trinh", GUEST_NAME, "coral"],
  ["daniel", "Daniel", "mint"],
  ["an", "Minh-An", "lilac"],
  ["hy", "Minh-Hy", "sky"],
  ["bao", "Bao", "sun"],
  ["grandma", "Grandma", "glacier"],
] as const satisfies readonly (readonly [string, string, TagColor])[];

type Member = (typeof FAMILY)[number][0];

type Who = readonly Member[] | "everyone";

type Plan = {
  title: string;
  location?: string;
  who: Who;
  time?: readonly [number, number];
  notes?: string;
};

type Season = { special: Map<string, Plan[]>; schoolOff: Set<string>; quiet: Set<string> };

const SUN = 0;
const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const FRI = 5;
const SAT = 6;

const DAY_MS = 24 * 60 * 60 * 1000;

const SCHOOL = "Maple Grove Elementary";
const PRESCHOOL = "Little Acorns Preschool";
const MONON = "Monon Community Center";
const LIBRARY = "Carmel Clay Public Library";
const GRANDMA_HOUSE = "Grandma’s house";
const HOME = "Home";
const LIVING_ROOM = "Living room";
const KIDS = ["an", "hy"] as const;
const LITTLE_ONES = ["an", "hy", "bao"] as const;

const WEEKLY: Readonly<Record<number, readonly Plan[]>> = {
  [SUN]: [
    timed("16:00", "17:30", "Meal prep", "Kitchen", ["trinh", "daniel"]),
    timed("20:00", "20:30", "Video call with Ông Bà Nội", LIVING_ROOM, "everyone"),
  ],
  [MON]: [
    timed("09:00", "10:00", "Tai chi", MONON, ["grandma"]),
    timed("16:30", "17:15", "Piano lesson", "Ms. Lee’s studio", ["an", "trinh"], "Recital book"),
  ],
  [TUE]: [timed("19:00", "20:00", "Yoga", "Studio Breathe", ["trinh"], "Yoga mat")],
  [WED]: [
    timed("09:00", "10:00", "Tai chi", MONON, ["grandma"]),
    timed("10:00", "10:45", "Story time", LIBRARY, ["bao", "grandma"]),
    timed(
      "16:15",
      "17:00",
      "Swim lesson",
      "Monon Center pool",
      ["hy", "grandma"],
      "Goggles, towel",
    ),
  ],
  [THU]: [
    timed("06:00", "06:45", "Morning run", "Monon Trail", ["daniel"]),
    timed("16:00", "17:30", "Art class", "Carmel Arts Studio", ["an"]),
    timed("19:00", "20:00", "Yoga", "Studio Breathe", ["trinh"], "Yoga mat"),
  ],
  [FRI]: [timed("18:30", "20:30", "Pizza & movie night", LIVING_ROOM, "everyone")],
  [SAT]: [
    timed("10:30", "11:30", "Grocery run", "Kroger", ["daniel"], "Shopping list"),
    timed("13:00", "14:30", "Vietnamese class", "Community center", KIDS),
  ],
};

const NOTES = [
  ["Minh-Hy’s party: 9 RSVPs so far!", GUEST_NAME, 35, -2],
  ["Library books are due Friday.", "Grandma", 140, 1.5],
  ["We’re out of milk and rice.", "Daniel", 300, -1],
  ["Great job on the spelling test, Minh-An!", "Grandma", 1500, 2.5],
  ["Guest Wi-Fi password is on the fridge.", "Daniel", 2900, -1.5],
] as const;

export function guestFamily(now: Date): GuestFamily {
  const tags = FAMILY.map(([key, name, color]) => ({
    key,
    tag: { id: uuidv7(now), name, color, createdAt: now.toISOString() },
  }));

  const tagIds = new Map(tags.map(({ key, tag }) => [key, tag.id]));

  const season = seasonOf(Number(dateKey(now, GUEST_TIME_ZONE).slice(0, 4)));

  const events = seasonDays(now).flatMap((key) =>
    dayPlans(key, season).map((plan) => toEvent(plan, key, tagIds, now)),
  );

  return {
    tags: tags.map(({ tag }) => tag),
    events,
    notes: NOTES.map((note) => toNote(note, now)),
  };
}

function timed(
  start: string,
  end: string,
  title: string,
  location: string,
  who: Who,
  notes?: string,
): Plan {
  return { title, location, who, time: [minutes(start), minutes(end)], ...(notes && { notes }) };
}

function allDay(title: string, who: Who, location?: string): Plan {
  return { title, who, ...(location && { location }) };
}

function minutes(time: string): number {
  const [hours = 0, mins = 0] = time.split(":").map(Number);

  return hours * 60 + mins;
}

function seasonDays(now: Date): string[] {
  const today = dateKey(now, GUEST_TIME_ZONE);

  const last = `${today.slice(0, 4)}-12-31`;

  const days = [`${today.slice(0, 7)}-01`];

  while ((days.at(-1) ?? last) < last) days.push(addDays(days.at(-1) ?? last, 1));

  return days;
}

function dayPlans(key: string, { special, schoolOff, quiet }: Season): Plan[] {
  const extra = special.get(key) ?? [];

  if (quiet.has(key)) return extra;

  return [...extra, ...weeklyPlans(key, !schoolOff.has(key))];
}

function weeklyPlans(key: string, schoolOpen: boolean): Plan[] {
  const day = weekday(key);

  const school = schoolOpen && day !== SAT && day !== SUN;

  return [
    ...(school ? schoolPlans(day) : []),
    ...(WEEKLY[day] ?? []),
    ...sportsPlans(key, day),
    ...weekendPlans(key, day),
  ];
}

function schoolPlans(day: number): Plan[] {
  const dropOff = day === TUE || day === THU ? "trinh" : "daniel";

  const pickUp = day === MON || day === WED ? "grandma" : day === FRI ? "daniel" : "trinh";

  const preschool = day === MON || day === WED || day === FRI;

  return [
    timed("07:30", "07:50", "School drop-off", SCHOOL, [dropOff, ...KIDS]),
    timed("07:50", "14:45", "School", SCHOOL, KIDS),
    timed("14:45", "15:05", "School pickup", SCHOOL, [pickUp, ...KIDS]),
    ...(preschool ? [timed("08:30", "12:00", "Preschool", PRESCHOOL, ["bao"], "Nap blanket")] : []),
  ];
}

function sportsPlans(key: string, day: number): Plan[] {
  const md = key.slice(5);

  if (day === TUE && md <= "11-10")
    return [
      timed("17:00", "18:15", "Soccer practice", "West Park", ["hy", "daniel"], "Shin guards"),
    ];

  if (day === SAT && md <= "11-07")
    return [
      timed(
        "09:00",
        "10:00",
        "Soccer game",
        "West Park fields",
        ["hy", "daniel", "trinh"],
        "Orange slices",
      ),
    ];

  if (day === TUE && md >= "12-01")
    return [timed("18:00", "19:00", "Basketball practice", "Monon Center gym", ["an", "daniel"])];

  if (day === SAT && md >= "12-05" && md <= "12-19")
    return [
      timed("10:00", "11:00", "Basketball game", "Monon Center gym", ["an", "daniel", "trinh"]),
    ];

  return [];
}

function weekendPlans(key: string, day: number): Plan[] {
  const md = key.slice(5);

  if (day === SAT && md <= "10-31")
    return [timed("08:00", "09:30", "Farmers market", "Carmel Farmers Market", ["trinh", "bao"])];

  if (day === SUN && weekNumber(key) % 2 === 0)
    return [timed("10:30", "12:00", "Sunday brunch", GRANDMA_HOUSE, "everyone")];

  if (day === SUN) return [timed("09:00", "10:00", "Pancake breakfast", "Kitchen", "everyone")];

  return [];
}

function seasonOf(year: number): Season {
  const d = (md: string) => `${year}-${md}`;

  const thanksgiving = thanksgivingOf(year);

  const fallBreak = weekdaysBetween(d("10-19"), d("10-23"));

  const thanksgivingBreak = weekdaysBetween(addDays(thanksgiving, -1), addDays(thanksgiving, 1));

  const winterBreak = weekdaysBetween(d("12-21"), d("12-31"));

  const trip = [d("12-27"), d("12-28"), d("12-29")];

  const special = new Map<string, Plan[]>([
    ...octoberPlans(d),
    ...novemberPlans(d, thanksgiving),
    ...decemberPlans(d),
  ]);

  addAll(special, fallBreak, allDay("Fall break · no school", KIDS, SCHOOL));
  addAll(special, thanksgivingBreak, allDay("Thanksgiving break · no school", KIDS, SCHOOL));
  addAll(special, winterBreak, allDay("Winter break · no school", KIDS, SCHOOL));
  addAll(special, trip, allDay("Chicago trip", "everyone", "Chicago"));

  return {
    special,
    schoolOff: new Set([...fallBreak, d("11-03"), ...thanksgivingBreak, ...winterBreak]),
    quiet: new Set([thanksgiving, d("12-24"), d("12-25"), ...trip, d("12-31")]),
  };
}

function octoberPlans(d: (md: string) => string): [string, Plan[]][] {
  return [
    [d("10-03"), [timed("14:00", "17:00", "Apple picking", "Tuttle Orchards", "everyone")]],
    [d("10-07"), [timed("18:00", "19:00", "PTO meeting", SCHOOL, ["trinh"])]],
    [
      d("10-10"),
      [
        timed(
          "15:00",
          "17:00",
          "Lily’s birthday party",
          "Bounce Zone",
          ["an", "trinh"],
          "Gift for Lily",
        ),
      ],
    ],
    [
      d("10-14"),
      [
        timed(
          "15:30",
          "16:30",
          "Dentist",
          "Carmel Family Dental",
          ["an", "hy", "trinh"],
          "Insurance card",
        ),
      ],
    ],
    [
      d("10-20"),
      [
        timed("10:00", "14:00", "Children’s Museum", "Children’s Museum of Indianapolis", [
          "trinh",
          ...LITTLE_ONES,
        ]),
      ],
    ],
    [d("10-22"), [timed("13:00", "14:00", "Flu shots", "Riverview Clinic", "everyone")]],
    [
      d("10-24"),
      [timed("10:00", "13:00", "Pumpkin patch", "Stonycreek Farm", "everyone", "Wagon, boots")],
    ],
    [d("10-25"), [timed("15:00", "16:30", "Pumpkin carving", "Back porch", "everyone")]],
    [d("10-28"), [timed("08:00", "09:00", "Oil change", "Carmel Auto Care", ["daniel"])]],
    [
      d("10-30"),
      [timed("13:30", "14:30", "Halloween parade", SCHOOL, ["an", "hy", "trinh"], "Costumes")],
    ],
    [
      d("10-31"),
      [
        allDay("Halloween", "everyone"),
        timed(
          "17:30",
          "20:00",
          "Trick-or-treating",
          "Neighborhood",
          "everyone",
          "Flashlights, candy bags",
        ),
      ],
    ],
  ];
}

function novemberPlans(d: (md: string) => string, thanksgiving: string): [string, Plan[]][] {
  return [
    [d("11-01"), [allDay("Daylight saving ends · clocks back 1 hour", "everyone")]],
    [
      d("11-03"),
      [
        allDay("Election Day · no school", KIDS, SCHOOL),
        timed("07:00", "07:30", "Vote", "Carmel City Hall", ["trinh", "daniel"], "Photo ID"),
      ],
    ],
    [d("11-05"), [timed("18:00", "20:00", "Work dinner", "Downtown Indy", ["daniel"])]],
    [
      d("11-07"),
      [
        timed("11:00", "12:30", "Soccer end-of-season party", "Pizza King", [
          "hy",
          "daniel",
          "trinh",
        ]),
      ],
    ],
    [d("11-11"), [allDay("Veterans Day", "everyone")]],
    [
      d("11-12"),
      [
        timed("16:00", "16:20", "Parent-teacher conference · Minh-An", SCHOOL, ["trinh", "daniel"]),
        timed("16:30", "16:50", "Parent-teacher conference · Minh-Hy", SCHOOL, ["trinh", "daniel"]),
      ],
    ],
    [
      d("11-14"),
      [
        timed("19:00", "22:00", "Date night", "Vida", ["trinh", "daniel"]),
        timed("18:30", "22:30", "Grandma babysits", HOME, ["grandma", ...LITTLE_ONES]),
      ],
    ],
    [
      d("11-17"),
      [
        allDay("Minh-Hy’s 7th birthday", "everyone"),
        timed("18:00", "19:30", "Birthday dinner", HOME, "everyone", "Cake and candles"),
      ],
    ],
    [
      d("11-19"),
      [timed("10:00", "11:00", "Eye doctor", "Carmel Eye Center", ["grandma", "trinh"])],
    ],
    [
      d("11-21"),
      [
        timed(
          "14:00",
          "16:00",
          "Minh-Hy’s birthday party",
          "Sky Zone Fishers",
          "everyone",
          "Party favors, gift bags",
        ),
      ],
    ],
    [
      d("11-22"),
      [timed("14:00", "15:00", "Holiday photos", "Central Park", "everyone", "Matching sweaters")],
    ],
    [
      addDays(thanksgiving, -1),
      [timed("16:00", "18:00", "Pie baking", "Kitchen", ["trinh", "an", "grandma"])],
    ],
    [
      thanksgiving,
      [
        allDay("Thanksgiving", "everyone"),
        timed(
          "14:00",
          "18:00",
          "Thanksgiving dinner",
          GRANDMA_HOUSE,
          "everyone",
          "Green bean casserole, pumpkin pie",
        ),
      ],
    ],
    [
      addDays(thanksgiving, 1),
      [timed("09:00", "11:00", "Pick out the Christmas tree", "Piney Acres Tree Farm", "everyone")],
    ],
    [
      addDays(thanksgiving, 2),
      [
        timed(
          "17:00",
          "19:00",
          "Christkindlmarkt",
          "Carmel Christkindlmarkt",
          "everyone",
          "Mittens",
        ),
      ],
    ],
  ];
}

function decemberPlans(d: (md: string) => string): [string, Plan[]][] {
  return [
    [d("12-02"), [timed("19:00", "20:30", "Book club", "Books & Brews", ["trinh"])]],
    [
      d("12-05"),
      [timed("08:00", "09:30", "Breakfast with Santa", MONON, ["daniel", ...LITTLE_ONES])],
    ],
    [d("12-06"), [timed("15:00", "17:00", "Decorate the tree", LIVING_ROOM, "everyone")]],
    [
      d("12-09"),
      [
        timed(
          "15:30",
          "16:15",
          "Bao’s checkup",
          "Riverview Pediatrics",
          ["bao", "trinh"],
          "Insurance card",
        ),
      ],
    ],
    [d("12-10"), [timed("18:30", "19:30", "Winter concert", SCHOOL, "everyone")]],
    [
      d("12-12"),
      [timed("13:00", "15:00", "Gingerbread houses", "Kitchen", ["grandma", ...LITTLE_ONES])],
    ],
    [
      d("12-13"),
      [timed("18:00", "19:30", "Holiday lights drive", "Neighborhood loop", "everyone")],
    ],
    [
      d("12-18"),
      [timed("13:00", "14:00", "Class holiday party", SCHOOL, ["an", "trinh"], "Sugar cookies")],
    ],
    [
      d("12-19"),
      [timed("14:00", "16:30", "The Nutcracker", "The Palladium", ["trinh", "grandma", ...KIDS])],
    ],
    [d("12-20"), [timed("14:00", "16:00", "Cookie swap", "Neighbors’ house", ["trinh", "bao"])]],
    [
      d("12-22"),
      [timed("10:00", "12:00", "Ice skating", "Carmel Christkindlmarkt rink", ["daniel", ...KIDS])],
    ],
    [d("12-23"), [timed("09:00", "11:00", "Wrap presents", "Bedroom", ["trinh", "daniel"])]],
    [
      d("12-24"),
      [
        allDay("Christmas Eve", "everyone"),
        timed(
          "18:00",
          "21:00",
          "Christmas Eve dinner",
          GRANDMA_HOUSE,
          "everyone",
          "Spring rolls, wine",
        ),
      ],
    ],
    [
      d("12-25"),
      [
        allDay("Christmas Day", "everyone"),
        timed("08:00", "10:00", "Open presents", LIVING_ROOM, "everyone"),
        timed("13:00", "15:00", "Christmas lunch", HOME, "everyone"),
      ],
    ],
    [
      d("12-26"),
      [timed("16:00", "17:00", "Pack for Chicago", HOME, ["trinh", "daniel"], "Chargers, snacks")],
    ],
    [d("12-27"), [timed("08:00", "11:30", "Drive to Chicago", "I-65 N", "everyone")]],
    [
      d("12-28"),
      [
        timed("10:00", "13:00", "Museum of Science and Industry", "Hyde Park", "everyone"),
        timed("17:30", "19:00", "Dinner in Chinatown", "Chinatown", "everyone"),
      ],
    ],
    [d("12-29"), [timed("15:00", "18:30", "Drive home", "I-65 S", "everyone")]],
    [d("12-30"), [timed("10:00", "12:00", "Unpack and laundry", HOME, ["trinh", "daniel"])]],
    [
      d("12-31"),
      [
        allDay("New Year’s Eve", "everyone"),
        timed(
          "19:00",
          "24:30",
          "New Year’s Eve party",
          "Neighbors’ house",
          "everyone",
          "Sparkling cider",
        ),
      ],
    ],
  ];
}

function addAll(special: Map<string, Plan[]>, keys: readonly string[], plan: Plan): void {
  for (const key of keys) special.set(key, [plan, ...(special.get(key) ?? [])]);
}

function weekdaysBetween(from: string, to: string): string[] {
  const days: string[] = [];

  for (let key = from; key <= to; key = addDays(key, 1)) {
    if (weekday(key) !== SAT && weekday(key) !== SUN) days.push(key);
  }

  return days;
}

function thanksgivingOf(year: number): string {
  const first = `${year}-11-01`;

  const firstThursday = (THU - weekday(first) + 7) % 7;

  return addDays(first, firstThursday + 21);
}

function weekday(key: string): number {
  return parseDateKey(key).getUTCDay();
}

function weekNumber(key: string): number {
  return Math.floor(parseDateKey(key).getTime() / DAY_MS / 7);
}

function toEvent(plan: Plan, key: string, tagIds: Map<Member, string>, now: Date): CalendarEvent {
  const who =
    plan.who === "everyone"
      ? { everyone: true, tagIds: [] }
      : { everyone: false, tagIds: plan.who.map((member) => tagIds.get(member) ?? "") };

  return {
    id: uuidv7(now),
    ...span(plan, key),
    title: plan.title,
    ...(plan.location && { location: plan.location }),
    ...who,
    ...(plan.notes && { notes: `Bring ${plan.notes.toLowerCase()}` }),
  };
}

function span({ time }: Plan, key: string): Pick<CalendarEvent, "startAt" | "endAt" | "allDay"> {
  if (time === undefined) return { startAt: allDayStart(key), allDay: true };

  const date = calendarDate(key);

  return {
    startAt: zonedInstant(GUEST_TIME_ZONE, date, time[0]).toISOString(),
    endAt: zonedInstant(GUEST_TIME_ZONE, date, time[1]).toISOString(),
  };
}

function toNote([text, author, minutesAgo, rotation]: (typeof NOTES)[number], now: Date): Note {
  return {
    id: uuidv7(now),
    text,
    author,
    createdAt: new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString(),
    rotation,
  };
}
