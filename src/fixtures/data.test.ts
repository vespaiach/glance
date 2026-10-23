import { existsSync } from "node:fs";
import path from "node:path";
import * as v from "valibot";
import { eventDayKey } from "@/domain/allDay";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { eventStatus } from "@/domain/eventStatus";
import { noteExpired, noteStamp } from "@/domain/notes";
import {
  AccountSchema,
  AccountSettingsSchema,
  CalendarEventSchema,
  NoteSchema,
  PhotoSchema,
  TagSchema,
  WeatherSchema,
} from "@/domain/schemas";
import { isTimeZone } from "@/domain/signIn";
import { type EventWho, whoLabel } from "@/domain/tags";
import { formatClock, minutesOfDay } from "@/domain/time";
import { todaysPhoto } from "@/domain/todaysPhoto";
import { rainStart } from "@/domain/weather";
import { dateKey, wallTime } from "@/domain/zone";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_ALL_DAY,
  FIXTURE_AMBIENT_NOW,
  FIXTURE_AMBIENT_WEATHER,
  FIXTURE_EVENTS,
  FIXTURE_FAMILY,
  FIXTURE_MANY_EVENTS,
  FIXTURE_NOTES,
  FIXTURE_NOW,
  FIXTURE_PHOTOS,
  FIXTURE_PLACES,
  FIXTURE_SETTINGS,
  FIXTURE_SHEET_TARGETS,
  FIXTURE_TIME_ZONE,
  FIXTURE_UPLOADED_PHOTOS,
  FIXTURE_UPLOADS,
  FIXTURE_WEATHER,
  fixturePhotoImage,
} from "./data";

const tz = "America/Los_Angeles";

const publicDir = path.join(import.meta.dirname, "..", "..", "public");

const onDay = (day: number, events = FIXTURE_EVENTS) =>
  events
    .filter((event) => wallTime(new Date(event.startAt), tz).day === day)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

const clock = (iso: string | undefined) =>
  iso === undefined ? undefined : formatClock(minutesOfDay(new Date(iso), tz), "12h");

const who = (event: EventWho) => whoLabel(event, FIXTURE_FAMILY, "Everyone");

const titleOf = (id: string | undefined) => FIXTURE_PHOTOS.find((photo) => photo.id === id)?.title;

describe("Appendix A fixtures", () => {
  it("Appendix A every row passes its domain schema", () => {
    for (const event of [
      ...FIXTURE_EVENTS,
      ...FIXTURE_MANY_EVENTS,
      ...Object.values(FIXTURE_ALL_DAY),
    ])
      v.parse(CalendarEventSchema, event);
    for (const tag of FIXTURE_FAMILY) v.parse(TagSchema, tag);
    for (const note of FIXTURE_NOTES) v.parse(NoteSchema, note);
    for (const photo of FIXTURE_PHOTOS) v.parse(PhotoSchema, photo);
    v.parse(WeatherSchema, FIXTURE_WEATHER);
    v.parse(WeatherSchema, FIXTURE_AMBIENT_WEATHER);
    v.parse(AccountSettingsSchema, FIXTURE_SETTINGS);
    v.parse(AccountSchema, FIXTURE_ACCOUNT);
  });

  it("Appendix A ids are unique", () => {
    const ids = [
      ...FIXTURE_FAMILY,
      ...FIXTURE_EVENTS,
      ...FIXTURE_MANY_EVENTS,
      ...Object.values(FIXTURE_ALL_DAY),
      ...FIXTURE_NOTES,
      ...FIXTURE_PHOTOS,
    ].map((row) => row.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("LOC-06 the fixture zone is the fixture place's, America/Los_Angeles", () => {
    expect(FIXTURE_TIME_ZONE).toBe(tz);
    expect(FIXTURE_SETTINGS.weatherLocation?.timeZone).toBe(tz);
  });

  it("LOC-06 the clock is frozen at Fri Oct 9 2026 10:41 AM Pacific, Ambient at 7:12 PM", () => {
    expect(FIXTURE_NOW).toEqual(new Date("2026-10-09T17:41:00Z"));
    expect(FIXTURE_AMBIENT_NOW).toEqual(new Date("2026-10-10T02:12:00Z"));
  });

  it("Appendix A the family is nine tags in order, each with their block color", () => {
    expect(FIXTURE_FAMILY.map((tag) => [tag.name, tag.color])).toEqual([
      ["Minh-An", "lilac"],
      ["Minh-Hy", "sky"],
      ["Mom", "coral"],
      ["Dad", "mint"],
      ["Thang", "sun"],
      ["Tin", "pink"],
      ["Nghe", "lime"],
      ["An", "rust"],
      ["Nga", "glacier"],
    ]);
    expect(FIXTURE_FAMILY.map((tag) => tag.createdAt)).toEqual(
      FIXTURE_FAMILY.map((tag) => tag.createdAt).sort(),
    );
  });

  it("Appendix A Oct 9 has 18 timed plans from Morning run at 7:00 AM to Movie night at 7:00–8:30 PM", () => {
    const day = onDay(9);
    const [first] = day;
    const last = day.at(-1);

    expect(day).toHaveLength(18);
    expect([first?.title, clock(first?.startAt), first && who(first)]).toEqual([
      "Morning run",
      "7:00 AM",
      "Thang",
    ]);
    expect([last?.title, clock(last?.startAt), clock(last?.endAt), last && who(last)]).toEqual([
      "Movie night",
      "7:00 PM",
      "8:30 PM",
      "Everyone",
    ]);
  });

  it("STATUS-01 at 10:41 on Oct 9 School, Yoga class and Grandma’s video call are running", () => {
    const running = onDay(9).filter((event) => eventStatus(event, FIXTURE_NOW, tz) === "now");

    expect(running.map((event) => [event.title, who(event)])).toEqual([
      ["School", "Minh-An, Minh-Hy"],
      ["Yoga class", "Nga"],
      ["Grandma’s video call", "Mom"],
    ]);
  });

  it("Appendix A Oct 10 starts with Pick up bait at 4:30 AM and ends with Late movie at 10:00 PM", () => {
    const day = onDay(10);

    expect([day.at(0)?.title, clock(day.at(0)?.startAt)]).toEqual(["Pick up bait", "4:30 AM"]);
    expect([day.at(-1)?.title, clock(day.at(-1)?.startAt)]).toEqual(["Late movie", "10:00 PM"]);
  });

  it("Appendix A school weeks have drop-off, School and pickup each day", () => {
    for (const day of [5, 6, 7, 8, 9, 12, 13, 14, 15]) {
      expect(onDay(day).map((event) => event.title)).toEqual(
        expect.arrayContaining(["School drop-off", "School", "School pickup"]),
      );
    }
  });

  it("Appendix A Bring lists become notes", () => {
    const soccer = onDay(9).find((event) => event.title === "Soccer practice");

    expect(soccer?.notes).toBe("Bring shin guards, water bottle");
  });

  it("Appendix A events=many adds Family dinner, Bedtime story, Call the plumber and Walk the dog for 22 plans", () => {
    expect(FIXTURE_MANY_EVENTS.map((event) => event.title)).toEqual([
      "Family dinner",
      "Bedtime story",
      "Call the plumber",
      "Walk the dog",
    ]);
    expect(onDay(9, [...FIXTURE_EVENTS, ...FIXTURE_MANY_EVENTS])).toHaveLength(22);
  });

  it("EVT-08 the all-day fixtures are No school on the 16th and Grandpa staying over on the 9th", () => {
    const rows = Object.values(FIXTURE_ALL_DAY).map((event) => [
      v.parse(CalendarEventSchema, event).title,
      eventDayKey(event, tz),
      event.location,
      who(event),
    ]);

    expect(rows).toEqual([
      ["No school · teacher planning day", "2026-10-16", "Lincoln Elementary", "Minh-An, Minh-Hy"],
      ["Grandpa staying over", "2026-10-09", "Guest room", "Everyone"],
    ]);
  });

  it("tech§6 sheet=allday opens No school", () => {
    expect(FIXTURE_SHEET_TARGETS.allDay).toBe(FIXTURE_ALL_DAY.noSchool.id);
  });

  it("NOTE-04 notes are stamped 8:12 AM, 9:05 AM, Mon, Tue and Tue with their tilts", () => {
    const rows = FIXTURE_NOTES.map((note) => [
      note.author,
      noteStamp(note.createdAt, FIXTURE_NOW, "12h", tz),
      note.tone,
      note.rotation,
    ]);

    expect(rows).toEqual([
      ["Dad", { kind: "at", text: "8:12 AM" }, 1, -2],
      ["Mom", { kind: "at", text: "9:05 AM" }, 2, 1.5],
      ["Mom", { kind: "at", text: "Mon" }, 3, -1],
      ["Minh-Hy", { kind: "at", text: "Tue" }, 4, 2.5],
      ["Dad", { kind: "at", text: "Tue" }, "soft", -1.5],
    ]);
  });

  it("NOTE-08 no fixture note has expired under the default 7 days", () => {
    expect(
      FIXTURE_NOTES.some((note) => noteExpired(note, DEFAULT_SETTINGS.noteExpiry, FIXTURE_NOW)),
    ).toBe(false);
  });

  it("TODAY-07 Cannon Beach is today’s photo on Oct 9", () => {
    const pick = todaysPhoto(FIXTURE_PHOTOS, dateKey(FIXTURE_NOW, tz), tz, FIXTURE_ACCOUNT.id);

    expect(pick).toEqual({ photo: expect.objectContaining({ title: "Cannon Beach" }) });
  });

  it("BG-01 Cannon Beach is the default background photo", () => {
    expect(titleOf(FIXTURE_SETTINGS.background.photoId)).toBe("Cannon Beach");
    expect(FIXTURE_SETTINGS.background.mode).toBe("season");
  });

  it("Appendix A every photo has a bundled image, never a network one", () => {
    for (const photo of [...FIXTURE_PHOTOS, ...FIXTURE_UPLOADED_PHOTOS]) {
      const image = fixturePhotoImage(photo.id);

      expect(image).toMatch(/^\/fixtures\/photos\/[a-z-]+\.svg$/);
      expect(existsSync(path.join(publicDir, image ?? ""))).toBe(true);
    }
  });

  it("PHOTO-06 upload previews are bundled images too", () => {
    const previews = Object.values(FIXTURE_UPLOADS)
      .flat()
      .flatMap((upload) => (upload.preview === undefined ? [] : [upload.preview]));

    expect(previews.length).toBeGreaterThan(0);

    for (const preview of previews) {
      expect(existsSync(path.join(publicDir, preview))).toBe(true);
    }
  });

  it("PHOTO-08 upload=error fails IMG_3307 as too large, Recipe card as not a photo and Halloween costumes on the network", () => {
    expect(FIXTURE_UPLOADS.error.map((upload) => [upload.title, upload.error])).toEqual([
      ["IMG_3307", "tooLarge"],
      ["Recipe card", "notPhoto"],
      ["Halloween costumes", "network"],
    ]);
  });

  it("WX-03 the fixture forecast brings rain at 4 PM, as the rain banner shows", () => {
    expect(rainStart(FIXTURE_WEATHER.hourly)).toBe("2026-10-09T23:00:00.000Z");
  });

  it("WX-01 the weather is Portland, OR at 64° partly cloudy with 8 hours and 7 days", () => {
    expect(FIXTURE_WEATHER.location).toBe("Portland, OR");
    expect(FIXTURE_WEATHER.current).toMatchObject({ temp: 64, condition: "partlyCloudy" });
    expect(FIXTURE_WEATHER.hourly.map((point) => point.temp)).toEqual([
      64, 66, 67, 68, 65, 61, 58, 56,
    ]);
    expect(FIXTURE_WEATHER.daily.map((day) => [day.high, day.low, day.precip])).toEqual([
      [68, 51, 20],
      [59, 48, 80],
      [61, 47, 30],
      [66, 49, undefined],
      [69, 50, undefined],
      [65, 50, 10],
      [58, 46, 70],
    ]);
  });

  it("AMB-03 Ambient shows 56° light rain", () => {
    expect(FIXTURE_AMBIENT_WEATHER.current).toMatchObject({
      temp: 56,
      condition: "lightRain",
      icon: "cloud-rain",
    });
  });

  it("WX-09 Portland and Springfield have several matches, Pordland (WX-08) has none", () => {
    const names = (query: string) =>
      FIXTURE_PLACES[query]?.map((place) => `${place.name}, ${place.region}`);

    expect(names("portland")).toEqual(["Portland, Oregon", "Portland, Maine"]);
    expect(names("springfield")).toEqual([
      "Springfield, Illinois",
      "Springfield, Missouri",
      "Springfield, Massachusetts",
    ]);
    expect(names("pordland")).toBeUndefined();
  });

  it("LOC-05 every search fixture carries its place's zone", () => {
    const zones = Object.fromEntries(
      Object.values(FIXTURE_PLACES)
        .flat()
        .map((place) => [`${place.name}, ${place.region}`, place.timeZone]),
    );

    expect(zones).toEqual({
      "Portland, Oregon": "America/Los_Angeles",
      "Portland, Maine": "America/New_York",
      "Springfield, Illinois": "America/Chicago",
      "Springfield, Missouri": "America/Chicago",
      "Springfield, Massachusetts": "America/New_York",
      "Seattle, Washington": "America/Los_Angeles",
      "Boston, Massachusetts": "America/New_York",
      "Chicago, Illinois": "America/Chicago",
      "Austin, Texas": "America/Chicago",
      "Denver, Colorado": "America/Denver",
      "New York, New York": "America/New_York",
    });
    expect(Object.values(zones).every((zone) => zone !== undefined && isTimeZone(zone))).toBe(true);
  });

  it("§6 sheet=event opens Lunch with Aunt Rosa and sheet=note opens the Wi-Fi note", () => {
    const event = FIXTURE_EVENTS.find((row) => row.id === FIXTURE_SHEET_TARGETS.event);
    const note = FIXTURE_NOTES.find((row) => row.id === FIXTURE_SHEET_TARGETS.note);

    expect(event?.title).toBe("Lunch with Aunt Rosa");
    expect(note?.text).toBe("Wi-Fi password is on the fridge!");
  });

  it("SIGNIN-12 the known account is Maria at maria@example.com", () => {
    expect(FIXTURE_ACCOUNT).toMatchObject({ email: "maria@example.com", name: "Maria" });
  });
});
