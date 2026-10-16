import { allDayStart } from "@/domain/allDay";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type {
  Account,
  AccountSettings,
  CalendarEvent,
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

const MINUTE_MS = 60 * 1000;

const before = (now: Date, minutes: number) =>
  new Date(now.getTime() - minutes * MINUTE_MS).toISOString();

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

export const FIXTURE_EVENTS: CalendarEvent[] = [
  {
    id: fixtureId(1, 1),
    startAt: at(9, 9),
    endAt: at(9, 9, 30),
    title: "School drop-off",
    location: "Lincoln Elementary",
    tone: "soft",
  },
  {
    id: fixtureId(1, 2),
    startAt: at(9, 10, 30),
    endAt: at(9, 11, 15),
    title: "Grandma’s video call",
    location: "Living room",
    tone: 1,
  },
  {
    id: fixtureId(1, 3),
    startAt: at(9, 12),
    endAt: at(9, 13),
    title: "Lunch with Aunt Rosa",
    location: "Café Lumen",
    tone: 2,
  },
  {
    id: fixtureId(1, 4),
    startAt: at(9, 14),
    endAt: at(9, 14, 20),
    title: "Dentist — Leo",
    location: "Dr. Patel",
    tone: "accent",
  },
  {
    id: fixtureId(1, 5),
    startAt: at(9, 15, 30),
    endAt: at(9, 16, 30),
    title: "Soccer practice",
    location: "Laurelhurst Park",
    tone: 3,
  },
  {
    id: fixtureId(1, 6),
    startAt: at(2, 19),
    endAt: at(2, 21),
    title: "Movie night",
    location: "Living room",
    tone: 2,
  },
  {
    id: fixtureId(1, 7),
    startAt: at(14, 16),
    endAt: at(14, 16, 30),
    title: "Parent-teacher conference",
    location: "Lincoln Elementary",
    tone: 4,
  },
  {
    id: fixtureId(1, 8),
    startAt: at(22, 16),
    endAt: at(22, 18),
    title: "Leo’s birthday party",
    location: "Home",
    tone: 3,
  },
  {
    id: fixtureId(1, 9),
    startAt: at(28, 17),
    endAt: at(28, 18, 30),
    title: "Pumpkin carving",
    location: "Back porch",
    tone: 1,
  },
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
    text: "Package for Mia at the front door.",
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
    author: "Mia",
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
    id: fixtureId(1, 10),
    startAt: allDayStart("2026-10-16"),
    allDay: true,
    title: "No school · teacher planning day",
    location: "Lincoln Elementary",
    tone: 4,
  },
  grandpa: {
    id: fixtureId(1, 11),
    startAt: allDayStart("2026-10-09"),
    allDay: true,
    title: "Grandpa staying over",
    location: "Guest room",
    tone: 2,
  },
} as const satisfies Record<string, CalendarEvent>;

export const FIXTURE_SEEDED_EVENTS: CalendarEvent[] = [...FIXTURE_EVENTS, FIXTURE_ALL_DAY.noSchool];

export const FIXTURE_MANY_EVENTS: CalendarEvent[] = [
  {
    id: fixtureId(1, 12),
    startAt: at(9, 17),
    endAt: at(9, 17, 30),
    title: "Grocery pickup",
    location: "Fred Meyer",
    tone: 4,
  },
  {
    id: fixtureId(1, 13),
    startAt: at(9, 18),
    endAt: at(9, 19),
    title: "Family dinner",
    location: "Home",
    tone: 1,
  },
  {
    id: fixtureId(1, 14),
    startAt: at(9, 19, 30),
    endAt: at(9, 20),
    title: "Piano practice — Mia",
    location: "Living room",
    tone: 2,
  },
  {
    id: fixtureId(1, 15),
    startAt: at(9, 20, 30),
    endAt: at(9, 21),
    title: "Bedtime story",
    location: "Kids’ room",
    tone: "soft",
  },
];

export const FIXTURE_SHEET_TARGETS = {
  event: fixtureId(1, 3),
  allDay: FIXTURE_ALL_DAY.noSchool.id,
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

export function fixturePhotoImage(photoId: string): string | undefined {
  const slug = PHOTO_IMAGES.get(photoId);

  return slug && imagePath(slug);
}

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
