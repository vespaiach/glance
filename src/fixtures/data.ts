import { allDayStart } from "@/domain/allDay";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type {
  Account,
  AccountSettings,
  CalendarEvent,
  Member,
  MemberColor,
  Note,
  Photo,
  Weather,
  WeatherIcon,
  WeatherLocation,
} from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import { zonedInstant } from "@/domain/zone";

const fixtureId = (group: number, n: number) =>
  `0000000${group}-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const FIXTURE_TIME_ZONE = "America/Los_Angeles";

const octoberAt = (day: number, hour: number, minute = 0) =>
  zonedInstant(FIXTURE_TIME_ZONE, { year: 2026, month: 10, day }, hour * 60 + minute);

const at = (day: number, hour: number, minute = 0) => octoberAt(day, hour, minute).toISOString();

export const FIXTURE_NOW = octoberAt(9, 10, 41);

export const FIXTURE_AMBIENT_NOW = octoberAt(9, 19, 12);

export const FIXTURE_SAVED_AT = at(9, 9, 32);

export const FIXTURE_ACCOUNT: Account = {
  id: fixtureId(4, 1),
  email: "maria@example.com",
  name: "Maria",
};

export const FIXTURE_OTHER_EMAIL = "sam.lee@example.com";

export const FIXTURE_QR_URL = "https://glance.example.com/api/auth/verify?t=fixture-qr-code";

const MINUTE_MS = 60 * 1000;

const before = (now: Date, minutes: number) =>
  new Date(now.getTime() - minutes * MINUTE_MS).toISOString();

const FAMILY = [
  ["an", "Minh-An", "lilac"],
  ["hy", "Minh-Hy", "sky"],
  ["mom", "Mom", "coral"],
  ["dad", "Dad", "mint"],
  ["thang", "Thang", "sun"],
  ["tin", "Tin", "pink"],
  ["nghe", "Nghe", "lime"],
  ["an2", "An", "rust"],
  ["nga", "Nga", "glacier"],
] as const satisfies readonly (readonly [string, string, MemberColor])[];

type FamilyKey = (typeof FAMILY)[number][0];

type Who = readonly FamilyKey[] | "everyone";

export const FIXTURE_FAMILY: Member[] = FAMILY.map(([, name, color], index) => ({
  id: fixtureId(5, index + 1),
  name,
  color,
  createdAt: at(1, 9, index),
}));

const memberId = (key: FamilyKey) => fixtureId(5, FAMILY.findIndex(([k]) => k === key) + 1);

const whoOf = (who: Who) =>
  who === "everyone"
    ? { everyone: true, memberIds: [] }
    : { everyone: false, memberIds: who.map(memberId) };

const bringNotes = (bring: readonly string[]) =>
  bring.length === 0
    ? {}
    : {
        notes: `Bring ${bring.map((item) => item.charAt(0).toLowerCase() + item.slice(1)).join(", ")}`,
      };

const plan = (
  n: number,
  [day, start, end]: readonly [number, number, number],
  [title, location]: readonly [string, string],
  who: Who,
  bring: readonly string[] = [],
): CalendarEvent => ({
  id: fixtureId(1, n),
  startAt: at(day, 0, start),
  endAt: at(day, 0, end),
  title,
  location,
  ...whoOf(who),
  ...bringNotes(bring),
});

const SCHOOL = "Lincoln Elementary";

const schoolDay = (day: number, index: number): CalendarEvent[] => {
  const parent = day % 2 ? "dad" : "mom";

  const n = 40 + index * 3;

  return [
    plan(n, [day, 465, 495], ["School drop-off", SCHOOL], [parent, "an", "hy"]),
    plan(n + 1, [day, 495, 900], ["School", SCHOOL], ["an", "hy"]),
    plan(n + 2, [day, 900, 915], ["School pickup", SCHOOL], [parent, "an", "hy"]),
  ];
};

export const FIXTURE_EVENTS: CalendarEvent[] = [
  plan(1, [9, 465, 495], ["School drop-off", SCHOOL], ["dad", "an", "hy"], ["Library books"]),
  plan(2, [9, 630, 675], ["Grandma’s video call", "Living room"], ["mom"]),
  plan(3, [9, 720, 780], ["Lunch with Aunt Rosa", "Café Lumen"], ["mom"]),
  plan(4, [9, 840, 870], ["Dentist", "Dr. Patel"], ["mom", "an"], ["Insurance card"]),
  plan(
    5,
    [9, 930, 990],
    ["Soccer practice", "Laurelhurst Park"],
    ["hy", "dad"],
    ["Shin guards", "Water bottle"],
  ),
  plan(6, [9, 495, 900], ["School", SCHOOL], ["an", "hy"]),
  plan(7, [9, 900, 915], ["School pickup", SCHOOL], ["dad", "an", "hy"]),
  plan(8, [9, 810, 870], ["Car service", "Westside Auto"], ["dad"], ["Spare key"]),
  plan(9, [9, 1020, 1065], ["Piano lesson", "Ms. Tran’s studio"], ["an", "mom"], ["Recital book"]),
  plan(10, [9, 1140, 1230], ["Movie night", "Living room"], "everyone"),
  plan(11, [9, 420, 465], ["Morning run", "Laurelhurst Park"], ["thang"]),
  plan(12, [9, 570, 630], ["Physical therapy", "Eastside Clinic"], ["tin"], ["Exercise band"]),
  plan(13, [9, 600, 660], ["Yoga class", "Studio 7"], ["nga"], ["Yoga mat"]),
  plan(14, [9, 660, 780], ["Volunteer shift", "Food bank"], ["nghe"], ["Name badge"]),
  plan(15, [9, 780, 825], ["Haircut", "Salon Lumi"], ["an2"]),
  plan(16, [9, 960, 1020], ["Chess club", "Belmont Library"], ["tin"]),
  plan(17, [9, 990, 1005], ["Soccer pickup", "Laurelhurst Park"], ["nga", "hy"]),
  plan(18, [9, 1080, 1125], ["Pick up groceries", "Fred Meyer"], ["thang"], ["Shopping list"]),
  plan(20, [2, 1140, 1260], ["Movie night", "Living room"], "everyone"),
  plan(21, [4, 600, 720], ["Brunch at Grandma’s", "Grandma’s house"], "everyone"),
  plan(22, [5, 930, 990], ["Soccer practice", "Laurelhurst Park"], ["hy", "dad"], ["Shin guards"]),
  plan(23, [6, 1020, 1065], ["Piano lesson", "Ms. Tran’s studio"], ["an", "mom"], ["Recital book"]),
  plan(24, [6, 1110, 1200], ["Choir practice", "Community center"], ["nghe"]),
  plan(25, [7, 1140, 1230], ["Book club", "Powell’s Books"], ["mom", "nga"]),
  plan(26, [8, 600, 660], ["Doctor’s appointment", "Eastside Clinic"], ["an2"], ["Insurance card"]),
  plan(27, [8, 1050, 1110], ["Swim lesson", "Dishman pool"], ["hy", "dad"], ["Goggles", "Towel"]),
  plan(
    28,
    [10, 420, 660],
    ["Fishing trip", "Sauvie Island"],
    ["thang", "tin"],
    ["Fishing license"],
  ),
  plan(
    29,
    [10, 540, 630],
    ["Soccer game", "Laurelhurst Park"],
    ["hy", "dad", "mom", "an", "nga"],
    ["Orange slices"],
  ),
  plan(30, [10, 660, 720], ["Farmers market", "Shemanski Park"], ["dad"]),
  plan(36, [10, 270, 315], ["Pick up bait", "Fish & Tackle"], ["thang"]),
  plan(37, [10, 1320, 1410], ["Late movie", "Hollywood Theatre"], ["an", "hy"]),
  plan(
    31,
    [10, 840, 960],
    ["Sophie’s birthday party", "Bounce Town"],
    ["an", "mom"],
    ["Gift for Sophie"],
  ),
  plan(32, [14, 960, 990], ["Parent-teacher conference", SCHOOL], ["mom", "dad"]),
  plan(34, [22, 960, 1080], ["Minh-An’s birthday party", "Home"], "everyone"),
  plan(35, [28, 1020, 1110], ["Pumpkin carving", "Back porch"], "everyone"),
  ...[5, 6, 7, 8, 12, 13, 14, 15].flatMap(schoolDay),
];

export const FIXTURE_NOTES: Note[] = [
  {
    id: fixtureId(2, 1),
    text: "Wi-Fi password is on the fridge!",
    author: "Dad",
    createdAt: at(9, 8, 12),
    tone: 1,
    rotation: -2,
  },
  {
    id: fixtureId(2, 2),
    text: "Package for Minh-Hy at the front door.",
    author: "Mom",
    createdAt: at(9, 9, 5),
    tone: 2,
    rotation: 1.5,
  },
  {
    id: fixtureId(2, 3),
    text: "Window cleaner comes Wednesday — please leave blinds up.",
    author: "Mom",
    createdAt: at(5, 18, 30),
    tone: 3,
    rotation: -1,
  },
  {
    id: fixtureId(2, 4),
    text: "Welcome home, Grandpa!",
    author: "Minh-Hy",
    createdAt: at(6, 16, 45),
    tone: 4,
    rotation: 2.5,
  },
  {
    id: fixtureId(2, 5),
    text: "Bike lock code changes Friday. Ask Dad.",
    author: "Dad",
    createdAt: at(6, 7, 50),
    tone: "soft",
    rotation: -1.5,
  },
];

export const FIXTURE_NEW_NOTE_DRAFT = "Has anyone seen my blue umbr";

export const FIXTURE_ALL_DAY = {
  noSchool: {
    id: fixtureId(1, 33),
    startAt: allDayStart("2026-10-16"),
    allDay: true,
    title: "No school · teacher planning day",
    location: SCHOOL,
    ...whoOf(["an", "hy"]),
  },
  grandpa: {
    id: fixtureId(1, 19),
    startAt: allDayStart("2026-10-09"),
    allDay: true,
    title: "Grandpa staying over",
    location: "Guest room",
    ...whoOf("everyone"),
  },
} as const satisfies Record<string, CalendarEvent>;

export const FIXTURE_SEEDED_EVENTS: CalendarEvent[] = [...FIXTURE_EVENTS, FIXTURE_ALL_DAY.noSchool];

export const FIXTURE_MANY_EVENTS: CalendarEvent[] = [
  plan(81, [9, 1110, 1140], ["Family dinner", "Home"], "everyone"),
  plan(82, [9, 1230, 1260], ["Bedtime story", "Kids’ room"], ["mom", "an", "hy"]),
  plan(83, [9, 720, 750], ["Call the plumber", "Phone"], ["dad"]),
  plan(84, [9, 1035, 1065], ["Walk the dog", "Neighborhood"], ["nghe", "an2"]),
];

export const FIXTURE_SHEET_TARGETS = {
  event: fixtureId(1, 3),
  allDay: FIXTURE_ALL_DAY.noSchool.id,
  past: fixtureId(1, 1),
  note: fixtureId(2, 1),
  photo: fixtureId(3, 8),
  photoMeta: fixtureId(3, 7),
} as const;

const PHOTO_ROWS = [
  ["forest", "Forest Park trail", "2026-08-22", "Weekend hike"],
  ["bikes", "Bike ride", "2026-08-30", "Waterfront"],
  ["school", "First day of school", "2026-09-02", "Lincoln Elementary"],
  ["pumpkins", "Pumpkin patch", "2026-10-04", "Family outing"],
  ["orchard", "Apple picking", "2026-09-27", "Sauvie Island"],
  ["coast", "Cannon Beach", "2026-09-06", "Summer trip"],
] as const;

type PhotoSlug = (typeof PHOTO_ROWS)[number][0] | "beach" | "halloween";

const imagePath = (slug: PhotoSlug) => `/fixtures/photos/${slug}.svg`;

const CHECKED_FROM_PHOTO = {
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
} as const satisfies Pick<Photo, "sources" | "checked">;

export const FIXTURE_PHOTOS: Photo[] = PHOTO_ROWS.map(([, title, takenOn, place], index) => ({
  id: fixtureId(3, index + 1),
  title,
  takenOn,
  place,
  createdAt: at(4, 19, index),
  ...CHECKED_FROM_PHOTO,
}));

export const FIXTURE_UPLOADED_PHOTOS: Photo[] = [
  {
    id: fixtureId(3, 7),
    title: "Cannon Beach",
    takenOn: "2026-08-16",
    place: "Cannon Beach, OR",
    createdAt: at(9, 10, 30),
    sources: { title: "place", takenOn: "photo", place: "photo-location" },
    checked: false,
    fileName: "IMG_4410.JPG",
  },
  {
    id: fixtureId(3, 8),
    title: "Halloween costumes",
    takenOn: "2025-10-31",
    createdAt: at(9, 10, 31),
    sources: { title: "file-name", takenOn: "file-name", place: "none" },
    checked: false,
    fileName: "halloween-costumes-2025-10-31.jpg",
  },
];

const PHOTO_IMAGES = new Map<string, PhotoSlug>([
  ...PHOTO_ROWS.map(([slug], index) => [fixtureId(3, index + 1), slug] as const),
  [fixtureId(3, 7), "beach"],
  [fixtureId(3, 8), "halloween"],
]);

const PORTLAND_OR: WeatherLocation = {
  name: "Portland",
  region: "Oregon",
  lat: 45.5152,
  lon: -122.6784,
  timeZone: FIXTURE_TIME_ZONE,
};

export const FIXTURE_LOCATED_PLACE: WeatherLocation = { ...PORTLAND_OR, lat: 45.52, lon: -122.68 };

export const FIXTURE_SETTINGS: AccountSettings = {
  ...DEFAULT_SETTINGS,
  background: { ...DEFAULT_SETTINGS.background, photoId: fixtureId(3, 6) },
  weatherLocation: PORTLAND_OR,
};

const HOURLY: [hour: number, icon: WeatherIcon, temp: number, precip: number][] = [
  [11, "cloud-sun", 64, 10],
  [12, "cloud-sun", 66, 10],
  [13, "cloud", 67, 20],
  [14, "cloud", 68, 30],
  [15, "cloud-drizzle", 65, 40],
  [16, "cloud-rain", 61, 70],
  [17, "cloud-rain", 58, 80],
  [18, "cloud", 56, 40],
];

const DAILY: [icon: WeatherIcon, high: number, low: number, precip?: number][] = [
  ["cloud-sun", 68, 51, 20],
  ["cloud-rain", 59, 48, 80],
  ["cloud", 61, 47, 30],
  ["sun", 66, 49],
  ["sun", 69, 50],
  ["cloud-sun", 65, 50, 10],
  ["cloud-lightning", 58, 46, 70],
];

const isoDate = (day: number) => `2026-10-${String(day).padStart(2, "0")}`;

export const FIXTURE_WEATHER: Weather = {
  location: "Portland, OR",
  fetchedAt: at(9, 10, 30),
  current: {
    temp: 64,
    condition: "partlyCloudy",
    icon: "cloud-sun",
    high: 68,
    low: 51,
    feelsLike: 62,
    windMph: 8,
    windDir: "NW",
    humidity: 62,
    uv: 3,
    sunset: at(9, 18, 42),
  },
  hourly: HOURLY.map(([hour, icon, temp, precip]) => ({ time: at(9, hour), icon, temp, precip })),
  daily: DAILY.map(([icon, high, low, precip], index) => ({
    date: isoDate(9 + index),
    icon,
    high,
    low,
    ...(precip !== undefined && { precip }),
  })),
};

export const FIXTURE_AMBIENT_WEATHER: Weather = {
  ...FIXTURE_WEATHER,
  fetchedAt: at(9, 19),
  current: { ...FIXTURE_WEATHER.current, temp: 56, condition: "lightRain", icon: "cloud-rain" },
};

const place = (
  name: string,
  region: string,
  lat: number,
  lon: number,
  timeZone: string,
): WeatherLocation => ({ name, region, lat, lon, timeZone });

const NEW_YORK = "America/New_York";

const CHICAGO = "America/Chicago";

export const FIXTURE_OTHER_ZONE_PLACE = place("Portland", "Maine", 43.6591, -70.2568, NEW_YORK);

export const FIXTURE_PLACES: Readonly<Record<string, readonly WeatherLocation[]>> = {
  portland: [PORTLAND_OR, FIXTURE_OTHER_ZONE_PLACE],
  springfield: [
    place("Springfield", "Illinois", 39.7817, -89.6501, CHICAGO),
    place("Springfield", "Missouri", 37.2089, -93.2923, CHICAGO),
    place("Springfield", "Massachusetts", 42.1015, -72.5898, NEW_YORK),
  ],
  seattle: [place("Seattle", "Washington", 47.6062, -122.3321, FIXTURE_TIME_ZONE)],
  boston: [place("Boston", "Massachusetts", 42.3601, -71.0589, NEW_YORK)],
  chicago: [place("Chicago", "Illinois", 41.8781, -87.6298, CHICAGO)],
  austin: [place("Austin", "Texas", 30.2672, -97.7431, CHICAGO)],
  denver: [place("Denver", "Colorado", 39.7392, -104.9903, "America/Denver")],
  "new york": [place("New York", "New York", 40.7128, -74.006, NEW_YORK)],
  "97214": [PORTLAND_OR],
};

export const FIXTURE_UNKNOWN_PLACE = "Pordland";

export interface FixtureUpload {
  title: string;
  status: "uploading" | "paused" | "failed";
  progress: number;
  error?: "tooLarge" | "notPhoto" | "network";
  preview?: string;
}

export const FIXTURE_UPLOADS: Record<
  "one" | "progress" | "error" | "offline" | "done",
  FixtureUpload[]
> = {
  one: [{ title: "IMG_2041", status: "uploading", progress: 64, preview: imagePath("orchard") }],
  progress: [
    { title: "IMG_2041", status: "uploading", progress: 82, preview: imagePath("orchard") },
    { title: "IMG_2042", status: "uploading", progress: 35, preview: imagePath("pumpkins") },
    { title: "IMG_2043", status: "uploading", progress: 0, preview: imagePath("bikes") },
  ],
  error: [
    { title: "IMG_3307", status: "failed", progress: 0, error: "tooLarge" },
    { title: "Recipe card", status: "failed", progress: 0, error: "notPhoto" },
    {
      title: "Halloween costumes",
      status: "failed",
      progress: 0,
      error: "network",
      preview: imagePath("forest"),
    },
  ],
  offline: [{ title: "IMG_2041", status: "paused", progress: 40, preview: imagePath("orchard") }],
  done: [],
};

export function fixtureScreens(now: Date): SignedInScreen[] {
  return [
    {
      id: fixtureId(9, 1),
      kind: "monitor",
      browser: "Chrome",
      lastSeenAt: now.toISOString(),
      current: true,
    },
    {
      id: fixtureId(9, 2),
      kind: "monitor",
      browser: "Edge",
      lastSeenAt: before(now, 12),
      current: false,
    },
    {
      id: fixtureId(9, 3),
      kind: "tablet",
      browser: "Safari",
      lastSeenAt: before(now, 24 * 60),
      current: false,
    },
    {
      id: fixtureId(9, 4),
      kind: "smartphone",
      browser: "Safari",
      lastSeenAt: at(2, 18, 30),
      current: false,
    },
  ];
}

export function fixturePhotoImage(photoId: string): string | undefined {
  const slug = PHOTO_IMAGES.get(photoId);

  return slug && imagePath(slug);
}

export function fixtureMemberId(key: string): string | undefined {
  return FAMILY.some(([known]) => known === key) ? memberId(key as FamilyKey) : undefined;
}
