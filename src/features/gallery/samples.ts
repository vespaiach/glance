import type { EventStatus } from "@/domain/eventStatus";
import type {
  CalendarEvent,
  Note,
  NoteTone,
  Photo,
  Season,
  Tone,
  Weather,
  WeatherIcon,
  WeatherLocation,
} from "@/domain/schemas";
import { zonedInstant } from "@/domain/zone";
import type { ZoneState } from "@/domain/zoneState";
import type { UploadTile } from "@/features/photos";
import type { WeatherSetupFlow, WeatherSetupState } from "@/features/weather";

export const SEASONS: readonly Season[] = ["spring", "summer", "fall", "winter"];

export const GALLERY_TZ = "America/Los_Angeles";

export const octoberAt = (day: number, hour: number, minute = 0) =>
  zonedInstant(GALLERY_TZ, { year: 2026, month: 10, day }, hour * 60 + minute);

export const NOW = octoberAt(9, 10, 41);

export const NOW_DAY = { year: 2026, month: 9, day: 9 } as const;

export const gallery = {
  title: "Gallery",
  groups: {
    core: "Core",
    forms: "Forms",
    surfaces: "Surfaces",
    calendar: "Calendar",
    weather: "Weather",
    notes: "Notes",
    navigation: "Navigation",
    time: "Time entry",
    shared: "Shared pieces",
    zone: "Zone states",
    today: "Today",
    calendarView: "Calendar view",
    eventSheet: "Event sheet",
    weatherView: "Weather view",
    notesView: "Notes view",
    noteSheet: "Note sheet",
    photosView: "Photos view",
    settingsView: "Settings view",
    backgroundView: "Background view",
    locationView: "Location view",
    ambientView: "Ambient view",
    signInView: "Sign in view",
  },
  noteSheet: {
    edit: "Edit note",
    new: "New note",
    draft: "New note · draft",
    offline: "Offline",
  },
  eventSheet: {
    edit: "Edit event",
    new: "New event",
    start: "Picker on Starts",
    start24: "Starts · 24-hour",
    end: "Picker on Ends",
    error: "Ends before it starts",
    noEnd: "No end time",
    offline: "Offline",
    phone: "Phone",
  },
  button: "Add event",
  disabled: "Disabled",
  tabs: ["Auto", "Spring", "Summer", "Fall", "Winter"] as const,
  input: {
    label: "Title",
    value: "Soccer practice",
    placeholder: "What's happening?",
    notesLabel: "Note",
    notesValue: "Has anyone seen my blue umbr",
    error: "Add a title",
  },
  card: {
    eyebrow: "Next up",
    title: "Lunch with Aunt Rosa",
    body: "12:00 – 1:00 PM · Café Lumen",
  },
  banner: {
    title: "Rain later today",
    body: "Sat 80% rain. Bring the umbrellas in.",
    action: "Show forecast",
  },
  block: "Block",
  sheet: {
    open: "Open sheet",
    title: "New event",
    eyebrow: "Friday, October 9",
    close: "Close",
    cancel: "Cancel",
    save: "Save",
  },
  skeleton: "Loading events",
  empty: {
    eyebrow: "Today",
    title: "Nothing planned today",
    body: "Add an event and it shows up here for everyone.",
  },
  failure: {
    eyebrow: "Weather",
    title: "Couldn't load the weather",
    body: "Trying again in 30 s.",
    retry: "Try again",
  },
  swatch: "Color",
  offline: { label: "Offline", meta: "Changes save when back online" },
  settings: {
    clock: "Clock",
    clockBody: "How times are shown everywhere.",
    background: "Background",
    backgroundBody: "Cannon Beach · dim 30%",
  },
  zone: { ready: "Ready" },
  nav: {
    today: "Today",
    calendar: "Calendar",
    weather: "Weather",
    notes: "Notes",
    photos: "Photos",
    settings: "Settings",
  },
};

export type SampleEvent = {
  start: string;
  end?: string;
  title: string;
  location: string;
  status: EventStatus;
  dot: Tone;
};

export const NOW_EVENT: SampleEvent = {
  start: "10:30",
  end: "11:15",
  title: "Grandma's video call",
  location: "Living room",
  status: "now",
  dot: 1,
};

export const EVENTS: readonly SampleEvent[] = [
  {
    start: "9:00",
    end: "9:30",
    title: "School drop-off",
    location: "Lincoln Elementary",
    status: "past",
    dot: "soft",
  },
  NOW_EVENT,
  {
    start: "12:00",
    end: "1:00",
    title: "Lunch with Aunt Rosa",
    location: "Café Lumen",
    status: "upcoming",
    dot: 2,
  },
  {
    start: "2:00",
    end: "2:20",
    title: "Dentist — Leo",
    location: "Dr. Patel",
    status: "upcoming",
    dot: "accent",
  },
  {
    start: "3:30",
    title: "Soccer practice",
    location: "Laurelhurst Park",
    status: "upcoming",
    dot: 3,
  },
];

export const MARKED_DAYS: readonly number[] = [2, 9, 14, 22, 28];

export type SampleNote = {
  text: string;
  author: string;
  time: string;
  tone: NoteTone;
  rotate: number;
};

export const NOTES: readonly SampleNote[] = [
  { text: "Wi-Fi password is on the fridge!", author: "Dad", time: "8:12 AM", tone: 1, rotate: -2 },
  {
    text: "Package for Mia at the front door.",
    author: "Mom",
    time: "9:05 AM",
    tone: 2,
    rotate: 1.5,
  },
  {
    text: "Window cleaner comes Wednesday — please leave blinds up.",
    author: "Mom",
    time: "Mon",
    tone: 3,
    rotate: -1,
  },
  { text: "Welcome home, Grandpa!", author: "Mia", time: "Tue", tone: 4, rotate: 2.5 },
  {
    text: "Bike lock code changes Friday. Ask Dad.",
    author: "Dad",
    time: "Tue",
    tone: "soft",
    rotate: -1.5,
  },
];

export const WEATHER = {
  location: "Portland, OR",
  temp: 64,
  icon: "cloud-sun" as WeatherIcon,
  high: 68,
  low: 51,
  feelsLike: 62,
  details: [
    { label: "Wind", value: "8 mph NW" },
    { label: "Humidity", value: "62%" },
    { label: "UV", value: "3" },
    { label: "Sunset", value: "6:42 PM" },
  ],
};

export type SampleDay = {
  day: string;
  icon: WeatherIcon;
  high: number;
  low: number;
  precip?: number;
};

export const FORECAST: readonly SampleDay[] = [
  { day: "Today", icon: "cloud-sun", high: 68, low: 51, precip: 20 },
  { day: "Sat", icon: "cloud-rain", high: 59, low: 48, precip: 80 },
  { day: "Sun", icon: "cloud", high: 61, low: 47, precip: 30 },
  { day: "Mon", icon: "sun", high: 66, low: 49 },
  { day: "Tue", icon: "sun", high: 69, low: 50 },
  { day: "Wed", icon: "cloud-sun", high: 65, low: 50, precip: 10 },
  { day: "Thu", icon: "cloud-drizzle", high: 58, low: 46, precip: 70 },
];

export const SWATCHES: readonly { value: Tone; label: string }[] = [
  { value: 1, label: "Block 1" },
  { value: 2, label: "Block 2" },
  { value: 3, label: "Block 3" },
  { value: 4, label: "Block 4" },
  { value: "soft", label: "Soft" },
  { value: "accent", label: "Accent" },
];

export const ZONE_STATES: readonly ZoneState<string>[] = [
  { kind: "loading" },
  { kind: "empty" },
  { kind: "failed" },
  { kind: "ready", data: [NOW_EVENT.title], updatedAt: "10:12 AM" },
];

const todayAt = (hour: number, minute: number) => octoberAt(9, hour, minute).toISOString();

const sampleId = (n: number) => `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`;

export const TODAY_EVENTS: readonly CalendarEvent[] = [
  {
    id: sampleId(1),
    title: "School drop-off",
    location: "Lincoln Elementary",
    startAt: todayAt(9, 0),
    endAt: todayAt(9, 30),
    tone: "soft",
  },
  {
    id: sampleId(2),
    title: "Grandma’s video call",
    location: "Living room",
    startAt: todayAt(10, 30),
    endAt: todayAt(11, 15),
    tone: 1,
  },
  {
    id: sampleId(3),
    title: "Lunch with Aunt Rosa",
    location: "Café Lumen",
    startAt: todayAt(12, 0),
    endAt: todayAt(13, 0),
    tone: 2,
  },
];

export const TODAY_NOTES: readonly Note[] = [
  {
    id: sampleId(11),
    text: "Package for Mia at the front door.",
    author: "Mom",
    createdAt: todayAt(9, 5),
    tone: 2,
    rotation: 1.5,
  },
  {
    id: sampleId(12),
    text: "Wi-Fi password is on the fridge!",
    author: "Dad",
    createdAt: todayAt(8, 12),
    tone: 1,
    rotation: -2,
  },
];

const daysAgoAt = (days: number, hour: number, minute: number) =>
  octoberAt(9 - days, hour, minute).toISOString();

export const BOARD_NOTES: readonly Note[] = [
  ...TODAY_NOTES,
  {
    id: sampleId(13),
    text: "Window cleaner comes Wednesday — please leave blinds up.",
    author: "Mom",
    createdAt: daysAgoAt(4, 18, 20),
    tone: 3,
    rotation: -1,
  },
  {
    id: sampleId(14),
    text: "Welcome home, Grandpa!",
    author: "Mia",
    createdAt: daysAgoAt(3, 16, 45),
    tone: 4,
    rotation: 2.5,
  },
  {
    id: sampleId(15),
    text: "Bike lock code changes Friday. Ask Dad.",
    author: "Dad",
    createdAt: daysAgoAt(3, 7, 50),
    tone: "soft",
    rotation: -1.5,
  },
];

export const TODAY_PHOTO: Photo = {
  id: sampleId(21),
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  place: "Summer trip",
  createdAt: todayAt(8, 0),
};

export const TODAY_PHOTO_SRC = "/fixtures/photos/coast.svg";

const PHOTO_ROWS = [
  ["coast", "Cannon Beach", "2026-09-06", "Summer trip"],
  ["orchard", "Apple picking", "2026-09-27", "Sauvie Island"],
  ["pumpkins", "Pumpkin patch", "2026-10-04", "Family outing"],
  ["school", "First day of school", "2026-09-02", "Lincoln Elementary"],
  ["bikes", "Bike ride", "2026-08-30", "Waterfront"],
  ["forest", "Forest Park trail", "2026-08-22", "Weekend hike"],
] as const;

export const GALLERY_PHOTOS: Photo[] = PHOTO_ROWS.map(([slug, title, takenOn, place], index) => ({
  id: slug,
  title,
  takenOn,
  place,
  createdAt: todayAt(8, 59 - index),
}));

export const galleryPhotoSrc = (photoId: string) => `/fixtures/photos/${photoId}.svg`;

const preview = (slug: string) => `/fixtures/photos/${slug}.svg`;

export const UPLOAD_SAMPLES: Record<string, readonly UploadTile[]> = {
  one: [
    { id: "u1", title: "IMG_2041", preview: preview("orchard"), state: "uploading", percent: 64 },
  ],
  several: [
    { id: "u1", title: "IMG_2041", preview: preview("orchard"), state: "uploading", percent: 82 },
    { id: "u2", title: "IMG_2042", preview: preview("pumpkins"), state: "uploading", percent: 35 },
    { id: "u3", title: "IMG_2043", preview: preview("bikes"), state: "uploading", percent: 0 },
  ],
  failed: [
    { id: "u4", title: "IMG_3307", state: "failed", reason: "too-large" },
    { id: "u5", title: "Recipe card", state: "failed", reason: "not-a-photo" },
    { id: "u6", title: "Halloween costumes", state: "failed", reason: "network" },
  ],
  paused: [
    { id: "u1", title: "IMG_2041", preview: preview("orchard"), state: "paused", percent: 40 },
  ],
};

export const TODAY_WEATHER: Weather = {
  location: "Portland, OR",
  fetchedAt: todayAt(10, 30),
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
    sunset: todayAt(18, 42),
  },
  hourly: [],
  daily: [],
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

export const FULL_WEATHER: Weather = {
  ...TODAY_WEATHER,
  hourly: HOURLY.map(([hour, icon, temp, precip]) => ({
    time: todayAt(hour, 0),
    icon,
    temp,
    precip,
  })),
  daily: FORECAST.map((day, index) => ({
    date: `2026-10-${String(9 + index).padStart(2, "0")}`,
    icon: day.icon,
    high: day.high,
    low: day.low,
    ...(day.precip !== undefined && { precip: day.precip }),
  })),
};

export const DRY_WEATHER: Weather = {
  ...FULL_WEATHER,
  hourly: FULL_WEATHER.hourly.map((point) => ({ ...point, precip: 10 })),
};

export const PLACES: readonly WeatherLocation[] = [
  { name: "Portland", region: "Oregon", lat: 45.5152, lon: -122.6784, timeZone: GALLERY_TZ },
  { name: "Portland", region: "Maine", lat: 43.6591, lon: -70.2568, timeZone: "America/New_York" },
];

const ignoreSetup = () => {};

export function gallerySetup(state: WeatherSetupState, canLocate = true): WeatherSetupFlow {
  return {
    state,
    canLocate,
    type: ignoreSetup,
    submit: ignoreSetup,
    pick: ignoreSetup,
    locate: ignoreSetup,
    confirm: ignoreSetup,
    keep: ignoreSetup,
    skip: ignoreSetup,
  };
}
