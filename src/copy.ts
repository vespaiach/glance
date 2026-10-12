import type { Season } from "@/domain/schemas";
import type { WmoCondition } from "@/domain/wmo";

export const copy = {
  appName: "Glance",
  season: {
    spring: "Spring",
    summer: "Summer",
    fall: "Fall",
    winter: "Winter",
  } satisfies Record<Season, string>,
  nav: {
    label: "Views",
    view: {
      today: "Today",
      calendar: "Calendar",
      weather: "Weather",
      notes: "Notes",
      photos: "Photos",
      settings: "Settings",
    },
    background: "Background",
    signIn: "Sign in",
    ambient: "Ambient",
  },
  today: {
    seasonMonth: (season: string, month: string) => `${season} · ${month}`,
    hero: {
      now: "Happening now",
      next: "Up next",
      today: "Today",
      until: (end: string) => `until ${end}`,
      started: (start: string) => `started ${start}`,
      endedTitle: "Nothing else today",
      endedBody: "Today’s events have ended.",
      noneTitle: "Nothing scheduled",
      noneBody: "Events show here while they happen.",
      loading: "Loading calendar",
    },
    schedule: {
      count: (count: number) => {
        if (count === 0) return "Today · No events";

        return count === 1 ? "Today · 1 event" : `Today · ${count} events`;
      },
      loadingCount: "Today · Loading",
      addEvent: "Add event",
      fullCalendar: "Full calendar",
      emptyTitle: "No events yet",
      emptyBody: "Add the first one. It shows here and on the calendar.",
      loading: "Loading events",
    },
    picture: {
      eyebrow: "Picture of the day",
      emptyBody: "Appears once someone uploads a photo.",
      upload: "Upload",
      loading: "Loading photo",
    },
    weather: {
      needsTitle: "Weather needs a location",
      needsBody: "Set the city once and the forecast stays current.",
      setLocation: "Set location",
      loading: "Loading weather",
    },
    notes: {
      count: (count: number) => `Notes · ${count}`,
      loadingCount: "Notes",
      allNotes: "All notes",
      emptyTitle: "No notes yet",
      addNote: "Add note",
      loading: "Loading notes",
    },
    unavailable: {
      calendar: "Calendar unavailable",
      weather: "Weather unavailable",
      notes: "Notes unavailable",
      photos: "Photos unavailable",
    },
  },
  calendar: {
    previousMonth: "Previous month",
    nextMonth: "Next month",
    count: (count: number) => {
      if (count === 0) return "No events";

      return count === 1 ? "1 event" : `${count} events`;
    },
    loadingCount: "Loading",
    addEvent: "Add event",
    freeDay: "Nothing scheduled. A free day.",
    emptyTitle: "The calendar is empty",
    emptyBody: "Select a day, then add an event. Days with events get a dot.",
    caption: "Select an event to edit or delete it",
    loading: "Loading events",
    unavailable: "Calendar unavailable",
  },
  events: {
    now: "Now",
    time: {
      starts: "Starts",
      ends: "Ends",
      startGroup: "Start time",
      endGroup: "End time",
      change: "Change",
      noEnd: "No end time",
      endsBeforeStart: "Ends before it starts",
      hour: "Hour",
      minutes: "Minutes",
      length: "Length",
      done: "Done",
      hour24Cell: (hour: string) => `${hour} hundred`,
      minuteCell: (minutes: number) => `${minutes} minutes`,
      lengths: [
        { value: 30, label: "30 min" },
        { value: 60, label: "1 hr" },
        { value: 90, label: "1.5 hr" },
        { value: 120, label: "2 hr" },
      ],
    },
  },
  notes: {
    guestAuthor: "Guest",
    justNow: "Just now",
  },
  weather: {
    range: {
      high: "H",
      low: "L",
      feelsLike: "Feels like",
    },
    condition: {
      clear: "Clear",
      mostlyClear: "Mostly clear",
      partlyCloudy: "Partly cloudy",
      overcast: "Overcast",
      fog: "Fog",
      drizzle: "Drizzle",
      freezingDrizzle: "Freezing drizzle",
      lightRain: "Light rain",
      rain: "Rain",
      heavyRain: "Heavy rain",
      freezingRain: "Freezing rain",
      lightSnow: "Light snow",
      snow: "Snow",
      heavySnow: "Heavy snow",
      snowGrains: "Snow grains",
      rainShowers: "Rain showers",
      snowShowers: "Snow showers",
      thunderstorm: "Thunderstorm",
      thunderstormHail: "Thunderstorm with hail",
    } satisfies Record<WmoCondition, string>,
  },
} as const;
