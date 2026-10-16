import { existsSync } from "node:fs";
import path from "node:path";
import * as v from "valibot";
import { eventDayKey } from "@/domain/allDay";
import { eventStatus } from "@/domain/eventStatus";
import { noteExpired, noteStamp } from "@/domain/notes";
import { pictureOfDay } from "@/domain/pictureOfDay";
import {
  AccountSchema,
  AccountSettingsSchema,
  CalendarEventSchema,
  NoteSchema,
  PhotoSchema,
  WeatherSchema,
} from "@/domain/schemas";
import { isTimeZone } from "@/domain/signIn";
import { formatClock, minutesOfDay } from "@/domain/time";
import { rainStart } from "@/domain/weather";
import { dateKey, wallTime } from "@/domain/zone";
import {
  FIXTURE_ACCOUNT,
  FIXTURE_ALL_DAY,
  FIXTURE_AMBIENT_NOW,
  FIXTURE_AMBIENT_WEATHER,
  FIXTURE_EVENTS,
  FIXTURE_NOTES,
  FIXTURE_NOW,
  FIXTURE_PHOTOS,
  FIXTURE_PLACES,
  FIXTURE_SETTINGS,
  FIXTURE_SHEET_TARGETS,
  FIXTURE_TIME_ZONE,
  FIXTURE_UPLOADS,
  FIXTURE_WEATHER,
  fixturePhotoImage,
} from "./data";

const tz = "America/Los_Angeles";

const publicDir = path.join(import.meta.dirname, "..", "..", "public");

const onDay = (day: number) =>
  FIXTURE_EVENTS.filter((event) => wallTime(new Date(event.startAt), tz).day === day);

const titleOf = (id: string | undefined) => FIXTURE_PHOTOS.find((photo) => photo.id === id)?.title;

describe("Appendix A fixtures", () => {
  it("Appendix A every row passes its domain schema", () => {
    for (const event of FIXTURE_EVENTS) v.parse(CalendarEventSchema, event);
    for (const note of FIXTURE_NOTES) v.parse(NoteSchema, note);
    for (const photo of FIXTURE_PHOTOS) v.parse(PhotoSchema, photo);
    v.parse(WeatherSchema, FIXTURE_WEATHER);
    v.parse(WeatherSchema, FIXTURE_AMBIENT_WEATHER);
    v.parse(AccountSettingsSchema, FIXTURE_SETTINGS);
    v.parse(AccountSchema, FIXTURE_ACCOUNT);
  });

  it("Appendix A ids are unique", () => {
    const ids = [...FIXTURE_EVENTS, ...FIXTURE_NOTES, ...FIXTURE_PHOTOS].map((row) => row.id);

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

  it("STATUS-01 Oct 9 runs one past, one now and three upcoming events at 10:41", () => {
    const rows = onDay(9).map((event) => [event.title, eventStatus(event, FIXTURE_NOW, tz)]);

    expect(rows).toEqual([
      ["School drop-off", "past"],
      ["Grandma’s video call", "now"],
      ["Lunch with Aunt Rosa", "upcoming"],
      ["Dentist — Leo", "upcoming"],
      ["Soccer practice", "upcoming"],
    ]);
  });

  it("Appendix A October has events on the 2nd, 9th, 14th, 22nd and 28th", () => {
    const days = FIXTURE_EVENTS.map((event) => wallTime(new Date(event.startAt), tz));

    expect(days.every((day) => day.year === 2026 && day.month === 10)).toBe(true);
    expect([...new Set(days.map((day) => day.day))].sort((a, b) => a - b)).toEqual([
      2, 9, 14, 22, 28,
    ]);
  });

  it("EVT-08 the all-day fixtures are No school on the 16th and Grandpa staying over on the 9th", () => {
    const rows = Object.values(FIXTURE_ALL_DAY).map((event) => [
      v.parse(CalendarEventSchema, event).title,
      eventDayKey(event, tz),
      event.location,
      event.tone,
    ]);

    expect(rows).toEqual([
      ["No school · teacher planning day", "2026-10-16", "Lincoln Elementary", 4],
      ["Grandpa staying over", "2026-10-09", "Guest room", 2],
    ]);
  });

  it("tech§6 sheet=allday opens No school", () => {
    expect(FIXTURE_SHEET_TARGETS.allDay).toBe(FIXTURE_ALL_DAY.noSchool.id);
  });

  it("Appendix A event times match the handoff", () => {
    const times = FIXTURE_EVENTS.map((event) => [
      formatClock(minutesOfDay(new Date(event.startAt), tz), "12h"),
      event.endAt && formatClock(minutesOfDay(new Date(event.endAt), tz), "12h"),
      event.tone,
    ]);

    expect(times).toEqual([
      ["9:00 AM", "9:30 AM", "soft"],
      ["10:30 AM", "11:15 AM", 1],
      ["12:00 PM", "1:00 PM", 2],
      ["2:00 PM", "2:20 PM", "accent"],
      ["3:30 PM", "4:30 PM", 3],
      ["7:00 PM", "9:00 PM", 2],
      ["4:00 PM", "4:30 PM", 4],
      ["4:00 PM", "6:00 PM", 3],
      ["5:00 PM", "6:30 PM", 1],
    ]);
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
      ["Mia", { kind: "at", text: "Tue" }, 4, 2.5],
      ["Dad", { kind: "at", text: "Tue" }, "soft", -1.5],
    ]);
  });

  it("NOTE-08 no fixture note has expired under the default week", () => {
    expect(FIXTURE_NOTES.some((note) => noteExpired(note, "1w", FIXTURE_NOW))).toBe(false);
  });

  it("TODAY-07 Cannon Beach is the picture of the day on Oct 9", () => {
    const pick = pictureOfDay(FIXTURE_PHOTOS, dateKey(FIXTURE_NOW, tz), tz, FIXTURE_ACCOUNT.id);

    expect(pick).toEqual({ photo: expect.objectContaining({ title: "Cannon Beach" }) });
  });

  it("BG-01 Cannon Beach is the default background photo", () => {
    expect(titleOf(FIXTURE_SETTINGS.background.photoId)).toBe("Cannon Beach");
    expect(FIXTURE_SETTINGS.background.mode).toBe("season");
  });

  it("Appendix A every photo has a bundled image, never a network one", () => {
    for (const photo of FIXTURE_PHOTOS) {
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
