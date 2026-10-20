import type { AmbientRange, AmbientSummary } from "@/domain/idle";
import type { MemberColor, Season, WeatherIcon } from "@/domain/schemas";
import type { ActiveStamp, Device, DeviceKind } from "@/domain/screens";
import type { WmoCondition } from "@/domain/wmo";

export const copy = {
  appName: "Glance",
  zone: {
    updated: (label: string, time: string) => `${label} · Updated ${time}`,
    failedBody: (minutes: number) =>
      `The Glance server isn’t responding. Trying again in ${minutes} min.`,
    retry: "Try again",
  },
  season: {
    spring: "Spring",
    summer: "Summer",
    fall: "Fall",
    winter: "Winter",
  } satisfies Record<Season, string>,
  offline: {
    label: "Offline · showing saved data",
    saved: (time: string) => `Saved ${time}`,
  },
  nav: {
    view: {
      today: "Today",
      calendar: "Calendar",
      weather: "Weather",
      notes: "Notes",
      photos: "Photos",
      settings: "Settings",
    },
    ambientScreen: "Ambient screen",
    background: "Background",
    signIn: "Sign in",
    ambient: "Ambient",
    main: "Main",
    expandMenu: "Expand menu",
    showSidebar: "Show sidebar",
    hideSidebar: "Hide sidebar",
    closeSidebar: "Close sidebar",
    close: "Close",
  },
  today: {
    seasonMonth: (season: string, month: string) => `${season} · ${month}`,
    hero: {
      now: "Happening now",
      next: "Up next",
      today: "Today",
      until: (end: string) => `until ${end}`,
      started: (start: string) => `started ${start}`,
      left: (length: string) => `${length} left`,
      in: (length: string) => `In ${length}`,
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
      failedCount: "Today",
      addEvent: "Add event",
      fullCalendar: "Full calendar",
      emptyTitle: "No events yet",
      emptyBody: "Add the first one. It shows here and on the calendar.",
      loading: "Loading events",
    },
    picture: {
      eyebrow: "Picture of the day",
      onThisDay: (year: number) => `On this day · ${year}`,
      name: (title: string) => `Picture of the day: ${title}`,
      upload: "Upload a photo",
      allPhotos: "All photos",
      loading: "Loading photo",
    },
    weather: {
      name: "Weather now",
      now: (city: string) => `${city} · Now`,
      summary: (condition: string, high: number, low: number) =>
        `${condition} · High ${high}° · Low ${low}°`,
      rainFrom: (time: string) => `Rain from ${time}`,
      setTitle: "Set weather location",
      setBody: "The forecast and the clock follow it.",
      failedBody: (minutes: number) => `Trying again in ${minutes} min.`,
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
  timeline: {
    rain: (percent: number) => `${percent}% rain`,
    until: (time: string) => `Until ${time}`,
    free: (everyone: boolean, length: string) =>
      `${everyone ? "Everyone free" : "Free"} · ${length}`,
    freeName: (range: string) => `Free ${range}. Add event`,
    planName: (title: string, range: string) => `${title}, ${range}`,
    hourlyWeather: "Hourly weather",
  },
  calendar: {
    previousWeek: "Previous week",
    nextWeek: "Next week",
    week: (month: string, day: number) => `Week of ${month} ${day}`,
    showPlansFor: "Show plans for",
    edit: "Edit",
    editFamily: "Edit family members",
    spanLabel: "24 hours",
    span: (outside: number) => {
      if (outside === 0) return "24 hours";

      return `24 hours, ${outside} more ${outside === 1 ? "plan" : "plans"}`;
    },
    addEvent: "Add event",
    emptyTitle: "The calendar is empty",
    emptyBody: "Select a day, then add an event. Days with plans get a dot for each person.",
    updated: (time: string) => `Updated ${time}`,
    loading: "Loading events",
    unavailable: "Calendar unavailable",
    pickDate: "Pick a date",
    pickDateFor: (day: string) => `${day}. Pick a date`,
    today: "Today",
    close: "Close",
  },
  discard: {
    title: "Discard changes?",
    keepEditing: "Keep editing",
    discard: "Discard",
    newEvent: "This event won’t be added.",
    editEvent: "Your edits to this event won’t be saved.",
    note: "This note won’t be posted.",
    photo: "Your edits to this photo won’t be saved.",
    member: (name: string) => `${name} won’t be added.`,
  },
  family: {
    title: "Family",
    eyebrow: (count: number) => (count === 1 ? "1 member" : `${count} members`),
    close: "Close",
    done: "Done",
    list: "Family members",
    plans: (count: number) => {
      if (count === 0) return "No plans";

      return count === 1 ? "1 plan" : `${count} plans`;
    },
    remove: "Remove",
    removeMember: (name: string) => `Remove ${name}`,
    confirmTitle: (name: string) => `Remove ${name}?`,
    impact: (solo: number, shared: number) => {
      if (solo === 0 && shared === 0) return "They have no plans.";

      const deleted = solo === 1 ? "Their 1 plan is deleted." : `Their ${solo} plans are deleted.`;

      const takenOff = `They’re taken off ${shared === 1 ? "1 plan" : `${shared} plans`} shared with others.`;

      return [solo > 0 && deleted, shared > 0 && takenOff].filter(Boolean).join(" ");
    },
    cancel: "Cancel",
    addTitle: "Add member",
    name: "Name",
    add: "Add",
    color: "Color",
    addName: "Add a name",
    taken: "Already in the family",
    colors: {
      lilac: "Lilac",
      sky: "Sky",
      coral: "Coral",
      mint: "Mint",
      sun: "Sun",
      pink: "Pink",
      lime: "Lime",
      rust: "Rust",
      glacier: "Glacier",
      amber: "Amber",
      sage: "Sage",
      ice: "Ice",
    } satisfies Record<MemberColor, string>,
  },
  events: {
    now: "Now",
    allDay: "All day",
    everyone: "Everyone",
    sheet: {
      newTitle: "New event",
      editTitle: "Edit event",
      close: "Close",
      title: "Title",
      titlePlaceholder: "What’s happening",
      where: "Where",
      wherePlaceholder: "Home, school, park…",
      who: "Who",
      notes: "Notes",
      notesPlaceholder: "Anything to remember",
      add: "Add event",
      save: "Save",
      saveOffline: "Save for later",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete: "Delete event",
      addTitle: "Add a title",
      offlineTitle: "You’re offline",
      offlineBody: "Changes save on this screen and sync when the connection is back.",
    },
    details: {
      edit: "Edit",
      wholeDay: "Whole day",
      happeningNow: "Happening now",
      ended: "Ended",
      endedBody: "This event has ended and can’t be changed.",
    },
    swatches: {
      spring: ["Lime", "Pink", "Mint", "Lilac", "Cream"],
      summer: ["Sun", "Coral", "Sky", "Lime", "Cream"],
      fall: ["Amber", "Rust", "Sage", "Coral", "Cream"],
      winter: ["Ice", "Lilac", "Glacier", "Mint", "Frost"],
    } satisfies Record<Season, readonly [string, string, string, string, string]>,
    time: {
      label: "Time",
      setTimes: "Set times",
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
    waitingToPost: "Waiting to post",
    board: "Notice board",
    count: (count: number) => {
      if (count === 0) return "No notes";

      return count === 1 ? "1 note" : `${count} notes`;
    },
    loadingCount: "Loading",
    failedCount: "Notes",
    addNote: "Add note",
    loading: "Loading notes",
    unavailable: "Notes unavailable",
    caption: (keep: string) => `Select a note to edit or delete it · ${keep}`,
    keep: {
      "1d": "Notes are removed after 1 day",
      "1w": "Notes are removed after 1 week",
      never: "Notes stay until deleted",
    },
    emptyTitle: "No notes yet",
    emptyBody: (keep: string) => `Leave a note for the family. Notes show on Today. ${keep}`,
    emptyKeep: {
      "1d": "They’re removed after 1 day.",
      "1w": "They’re removed after 1 week.",
      never: "They stay until someone deletes them.",
    },
    details: {
      title: (author: string) => `From ${author}`,
      edit: "Edit",
    },
    sheet: {
      newTitle: "New note",
      editTitle: "Edit note",
      eyebrow: (author: string, time: string) => `${author} · ${time}`,
      close: "Close",
      message: "Message",
      messagePlaceholder: "Leave a note for the family",
      writeMessage: "Write a message",
      name: "Your name",
      namePlaceholder: "Optional",
      color: "Color",
      post: "Post note",
      save: "Save",
      saveOffline: "Save for later",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete: "Delete note",
      offlineTitle: "You’re offline",
      offlineBody: "The note saves on this screen and posts when the connection is back.",
    },
  },
  photos: {
    count: (count: number) => `Family photos · ${count}`,
    list: "Family photos",
    upload: "Upload",
    uploadPhotos: "Upload photos",
    picker: "Choose photos",
    emptyTitle: "No photos yet",
    emptyBody:
      "Upload family photos to show them here, as the picture of the day and as a background.",
    waitingForUploads: "Your photos show here once they finish uploading.",
    previous: "Previous photo",
    next: "Next photo",
    pause: "Pause slideshow",
    play: "Play slideshow",
    show: (title: string) => `Show ${title}`,
    noDate: "No date",
    datedInYear: (monthDay: string, year: number) => `${monthDay}, ${year}`,
    edit: "Edit photo details",
    fullScreen: "Full screen",
    exitFullScreen: "Exit full screen",
    fullScreenName: (title: string) => `${title} · full screen`,
    position: (n: number, total: number) => `${n} of ${total}`,
    hint: {
      both: (from: string) => `Name and date guessed from ${from}.`,
      name: (from: string) => `Name guessed from ${from}.`,
      date: (from: string) => `Date guessed from ${from}.`,
      noPlace: "No place found.",
      from: {
        "file-name": "the file name",
        file: "the file name",
        "file-date": "the file date",
        place: "where it was taken",
      },
    },
    sheet: {
      title: "Photo details",
      close: "Close",
      name: "Name",
      namePlaceholder: "What’s in the photo",
      addName: "Add a name",
      date: "Date taken",
      futureDate: "No future dates",
      place: "Place",
      placePlaceholder: "Optional",
      save: "Save",
      saveOffline: "Save for later",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete: "Delete photo",
      offlineTitle: "You’re offline",
      offlineBody: "Changes save on this screen and sync when the connection is back.",
      sources: {
        photo: "From photo",
        "photo-location": "From photo location",
        "file-name": "Guessed from file name",
        file: "File name",
        "file-date": "Guessed from file date",
        place: "Guessed from place",
        none: "Not in photo",
        edited: "Edited",
      },
    },
    loading: "Loading photos",
    unavailable: "Photos unavailable",
    tile: {
      uploading: (title: string) => `Uploading ${title}`,
      waiting: "Waiting",
      paused: "Paused",
      percent: (percent: number) => `${percent}%`,
      retry: "Try again",
      remove: "Remove",
      failed: {
        "too-large": "Too large · 20 MB max",
        "not-a-photo": "Not a photo",
        network: "Didn’t upload",
      },
    },
    row: {
      uploadingOne: (title: string) => `Uploading ${title}`,
      uploadingMany: (count: number) => `Uploading ${count} photos`,
      failed: (count: number) =>
        count === 1 ? "1 photo didn’t upload" : `${count} photos didn’t upload`,
      offline: "Offline · upload when back online",
      offlinePaused: (count: number) =>
        count === 1
          ? "Offline · 1 upload paused until back online"
          : `Offline · ${count} uploads paused until back online`,
    },
  },
  settings: {
    eyebrow: "Screen settings",
    title: "Settings",
    signedInAs: "Signed in as",
    signedInEmail: (email: string) => ` · ${email}`,
    location: {
      title: "Location",
      body: "Sets the weather and the time zone",
      notSet: "Not set",
      summary: (place: string, zone: string) => `${place} · ${zone}`,
    },
    season: {
      title: "Season",
      autoLabel: "Auto",
      following: (season: string) => `Follows the month · now ${season}`,
      fixed: (season: string) => `Fixed to ${season}`,
    },
    background: {
      title: "Background",
      body: "Photo, slideshow or the plain season palette",
      season: "Season color",
      photo: (title: string) => `Photo · ${title}`,
      slideshow: (interval: string) => `Slideshow · ${interval}`,
    },
    clock: {
      title: "Clock",
      body: "Used for every time on the screen",
      options: [
        { value: "12h", label: "12-hour" },
        { value: "24h", label: "24-hour" },
      ],
    },
    temperature: {
      title: "Temperature",
      body: "Weather is shown without a unit letter",
      options: [
        { value: "F", label: "Fahrenheit" },
        { value: "C", label: "Celsius" },
      ],
    },
    schedule: "Schedule",
    ambient: {
      title: "Ambient screen",
      summary: (summary: AmbientSummary) => ambientSummaryText(summary),
    },
    idle: {
      title: "Back to Today after",
      options: [
        { value: "60", label: "1 min" },
        { value: "180", label: "3 min" },
        { value: "300", label: "5 min" },
        { value: "never", label: "Never" },
      ],
    },
    noteExpiry: {
      title: "Remove notes after",
      options: [
        { value: "1d", label: "1 day" },
        { value: "1w", label: "1 week" },
        { value: "never", label: "Never" },
      ],
    },
    account: {
      title: "Account",
      screensSignedIn: (count: number) =>
        count === 1 ? "1 screen signed in" : `${count} screens signed in`,
      deviceKind: (kind: DeviceKind) => DEVICE_KIND[kind],
      screenName: (device: Device) => screenName(device),
      thisScreen: "This screen",
      active: (stamp: ActiveStamp) => activeText(stamp),
      signOut: "Sign out",
      signOutCaption: "Sign out this device only.",
      qr: {
        show: "Sign in another device",
        title: "Scan to sign in",
        body: (email: string) =>
          `Open the camera on the other device and point it at the code. It signs in with ${email}.`,
        label: "Sign-in code",
        expires: (seconds: number) =>
          `Code expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
        failed: "Couldn’t make a code. Try again.",
        retry: "Try again",
        done: "Done",
      },
    },
  },
  ambientSchedule: {
    back: "Settings",
    title: "Ambient screen",
    intro:
      "During these hours the screen dims to the clock, weather and next event. A touch wakes it.",
    schedule: "Schedule",
    modes: [
      { value: "same", label: "Every night" },
      { value: "split", label: "Weekends differ" },
      { value: "off", label: "Off" },
    ],
    sets: { every: "Every night", all: "Sun – Thu nights", wknd: "Fri & Sat nights" },
    dims: "Dims at",
    wakes: "Wakes at",
    dimGroup: "Dim time",
    wakeGroup: "Wake time",
    sameTime: "Same as dim time",
    notSet: "Not set",
    range: (start: string, end: string) => `${start} – ${end}`,
    bar: (set: string, range: string) => `${set}: ${range}`,
    staysBright: "The screen stays bright all day and night.",
    over24: "Over 24 hours",
    noon: "Noon",
    midnight: "Midnight",
    noHours: "No ambient hours.",
    wakeLine: (idleTimeout: number | null) =>
      idleTimeout === null
        ? "After a touch it stays awake until the next ambient start."
        : `After a touch it dims again when nobody has touched it for ${idleTimeout / 60} min.`,
    wakeLineOff: "Touch-to-wake and the idle timer work as usual.",
    preview: "Preview",
  },
  location: {
    back: "Settings",
    title: "Location",
    nowSetTo: "Now set to",
    notSet: "Not set",
    zoneNow: (zone: string, time: string) => `${zone} · ${time}`,
    deviceClock: "Times follow this device’s own clock",
    change: "Change location",
    set: "Set location",
    search: "Search",
    sets: "What the location sets",
    weather: {
      title: "Weather",
      body: "The forecast on Today, Weather and the ambient screen",
    },
    timeZone: {
      title: "Time zone",
      zoned: (zone: string) => `${zone} for the clock, Today, the calendar and event times`,
      unset: "The clock, Today, the calendar and event times",
    },
    caption: (zone: string) =>
      `The clock and event times follow ${zone}, even if this device is set to a different time.`,
    captionUnset: "Until a location is set, times follow this device’s own clock.",
    shared: "Shared by every screen on this account",
    confirm: {
      eyebrow: "Time zone change",
      title: (zone: string) => `Switch to ${zone}?`,
      hours: (n: number) => (n === 1 ? "1 hour" : `${n} hours`),
      moves: (place: string, zone: string, hours: string, direction: "ahead" | "back") =>
        `${place} is in ${zone}. The clock moves ${hours} ${direction}, and event times change to match on every screen.`,
      sameNow: (place: string, zone: string) =>
        `${place} is in ${zone}. The time is the same right now, but it can differ later in the year.`,
      before: (zone: string) => `Now · ${zone}`,
      after: (zone: string) => `After · ${zone}`,
      example: (title: string, time: string, shown: string) =>
        `${title} at ${time} will show at ${shown}.`,
      switch: (zone: string) => `Switch to ${zone}`,
      keep: (zone: string) => `Keep ${zone}`,
    },
  },
  background: {
    back: "Settings",
    title: "Background",
    modes: [
      { value: "season", label: "Season color" },
      { value: "photo", label: "Photo" },
      { value: "slideshow", label: "Slideshow" },
    ],
    selectOne: "Family photos · select one",
    inRotation: (count: number) => `Family photos · all ${count} in rotation`,
    list: "Family photos",
    use: (title: string) => `Use ${title} as background`,
    upload: "Upload photo",
    uploadOffline: "Upload when online",
    preview: "Preview",
    dim: {
      title: "Dim photo",
      options: [
        { value: "0", label: "Off" },
        { value: "0.2", label: "Light" },
        { value: "0.4", label: "Strong" },
      ],
    },
    rotate: {
      title: "Change photo",
      options: [
        { value: "hourly", label: "Hourly" },
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
      ],
    },
    interval: { hourly: "hourly", daily: "daily", weekly: "weekly" },
    caption: {
      season: "Screens use a plain light gray background. Pick a photo to switch.",
      photo: (title: string) =>
        `${title} is the background on every screen. Panels stay solid on top.`,
      slideshow: (title: string, interval: string) =>
        `Showing ${title}. The photo changes ${interval}; panels stay solid on top.`,
    },
    loading: "Loading photos",
    unavailable: "Photos unavailable",
  },
  weather: {
    now: (location: string) => `${location} · Now`,
    place: (name: string, region: string) => `${name}, ${region}`,
    details: {
      wind: "Wind",
      humidity: "Humidity",
      uv: "UV index",
      sunset: "Sunset",
    },
    wind: (speed: number, unit: "F" | "C", direction: string) =>
      `${speed} ${unit === "C" ? "km/h" : "mph"} ${direction}`,
    percent: (value: number) => `${value}%`,
    hourly: "Next 8 hours",
    daily: "7-day forecast",
    today: "Today",
    rain: {
      title: (time: string) => `Rain moving in after ${time}`,
      body: "Grab an umbrella if you’re heading out.",
    },
    offline: {
      title: (time: string) => `Forecast from ${time}`,
      body: "Updates when the screen is back online. Conditions may have changed.",
    },
    loading: "Loading weather",
    failed: {
      title: "Weather unavailable",
      body: (minutes: number) =>
        `The forecast service isn’t responding. Trying again in ${minutes} min.`,
      retry: "Try again",
    },
    setup: {
      eyebrow: "Weather · setup",
      title: "Where is this screen?",
      body: "The forecast and the clock’s time zone follow this place. You can change it later in Settings.",
      label: "City or ZIP code",
      placeholder: "Portland, OR",
      submit: "Show weather",
      locate: "Use my location",
      locating: "Finding where this screen is…",
      locatingHint: "If the browser asks, choose Allow.",
      searching: (query: string) => `Looking for ${query}…`,
      matches: (count: number, city: string) => `${count} places called ${city}`,
      region: (region: string, zone?: string) =>
        zone ? `${region}, United States · ${zone}` : `${region}, United States`,
      error: {
        empty: "Enter a city or ZIP code",
        unknown: "We couldn’t find that place. Try a city and state, like Austin, TX",
        unavailable: "Place search isn’t responding. Try again in a moment.",
        "save-failed": "Couldn’t save. Try again.",
      },
      notice: {
        denied: "Location is off for this screen. Type a city or ZIP instead.",
        "no-position": "Couldn’t find where this screen is. Try again, or type a city or ZIP.",
        outside:
          "This screen seems to be outside the US. Glance works for US places only. Type a US city or ZIP.",
        lookup: "Couldn’t look up this place. Try again, or type a city or ZIP.",
      },
    },
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
    icon: {
      sun: "Clear",
      moon: "Clear",
      "cloud-sun": "Partly cloudy",
      "cloud-moon": "Partly cloudy",
      cloud: "Cloudy",
      cloudy: "Overcast",
      "cloud-fog": "Fog",
      "cloud-drizzle": "Drizzle",
      "cloud-rain": "Rain",
      "cloud-snow": "Snow",
      snowflake: "Snow grains",
      "cloud-lightning": "Thunderstorm",
    } satisfies Record<WeatherIcon, string>,
  },
  ambient: {
    wake: "Wake screen",
    caption: "Click or tap anywhere to wake",
    offline: "Offline · showing saved data",
    signedOut: "Signed out · tap to sign in",
    now: (temp: number, condition: string) => `${temp}° · ${condition}`,
    low: (low: number) => `Low ${low}° overnight`,
    rain: (weekday: string, precip: number) => `${weekday} ${precip}% rain`,
    nextEvent: "Next event",
    nothing: "Nothing scheduled",
    tomorrow: "Tomorrow",
    allDay: "All day",
    day: (weekday: string, monthDay: string) => `${weekday}, ${monthDay}`,
    event: (day: string, start: string, title: string, where?: string) =>
      `${day} · ${start} · ${where ? `${title}, ${where}` : title}`,
    loadingWeather: "Loading weather",
    loadingEvent: "Loading next event",
  },
  signIn: {
    tagline: "Calendar, weather, notes and photos for your family. Sign in to manage them.",
    lock: "Only your family can see its calendar, notes and photos.",
    form: {
      eyebrow: "One account per family",
      title: "Sign in or get started",
      body: "Enter your email. We’ll send a link that signs this screen in. New here? The same link sets up your family’s Glance.",
      label: "Email",
      placeholder: "name@example.com",
      send: "Send sign-in link",
      sending: "Sending…",
      sendingTo: "Sending a link to ",
      invalid: "Enter a valid email address",
      failed: "Couldn’t send. Try again.",
      guest: "Sign-in as guests",
      guestFailed: "Couldn’t sign in. Try again.",
      offlineTitle: "You’re offline",
      offlineBody:
        "A link can’t be sent right now. Sending turns back on when the screen reconnects.",
    },
    ended: {
      notice: "This screen was signed out",
      noticeBody: "Sign in again to keep the calendar, notes and photos up to date.",
      waiting: (count: number) => `Changes waiting on this screen: ${count}.`,
      sentAfter: "They’ll be sent after you sign in.",
      title: "Sign in again",
      body: "Check your family’s email below. We’ll send a link that signs this screen back in.",
      switchBefore: "Changes waiting on this screen belong to ",
      switchAfter: ". They’ll be removed from this screen if a different email signs in.",
      previousEmail: (email: string) => `Use ${email}`,
    },
    eyebrow: "Sign in",
    sent: {
      title: "Check your email",
      before: "We sent a link to ",
      after: ". Open it and this screen signs in by itself.",
      expires: "Link expires in 10 minutes",
    },
    differentEmail: "Use a different email",
    differentEmailIn: (seconds: number) =>
      `Use a different email in 0:${String(seconds).padStart(2, "0")}`,
    name: {
      eyebrow: "New family account",
      title: "What’s your name?",
      before: "This is the first sign-in for ",
      after: ". Your name shows in Settings.",
      label: "Your name",
      placeholder: "First name is fine",
      submit: "Continue",
      empty: "Add your name",
      failed: "Couldn’t save. Try again.",
    },
    location: {
      eyebrow: "New family account",
      title: "Where is this screen?",
      body: "The weather and the clock’s time zone follow this place. You can change it later in Settings.",
      submit: "Continue",
      skip: "Skip for now",
    },
    phone: {
      title: "Finish on your phone",
      body: "The link opened on another device. Add your name and this screen’s location there, and this screen signs in by itself.",
      waiting: "Waiting for your phone",
      finished: "I finished on my phone",
    },
    expired: {
      title: "This link has expired",
      before: "Sign-in links work for 10 minutes. Send a new one to ",
      after: ".",
    },
    linkExpired: {
      eyebrow: "Sign-in link",
      title: "This link doesn’t work anymore",
      before:
        "It expired or was already used. Each link works once, for 10 minutes. Send a new one to ",
      after: ".",
    },
    resend: "Send a new link",
    email: {
      subject: "Your Glance sign-in link",
      preheader: "Tap to sign in. The link works once, for 10 minutes.",
      header: "Glance",
      eyebrow: "Sign-in link",
      title: "Sign in to Glance",
      body: "Tap the button and the screen that asked for this link signs in by itself. New here? The same link sets up your family’s Glance.",
      button: "Sign in",
      expires: "Works once, for 10 minutes",
      fallback: "Button not working? Copy this link into your browser:",
      ignoreTitle: "Didn’t ask for this?",
      ignoreBody: "You can ignore this email. No one can sign in unless this link is opened.",
      sentToBefore: "Sent to ",
      sentToAfter: " because it was entered on a Glance screen.",
      tagline: "Glance · Calendar, weather, notes and photos for your family.",
    },
    done: {
      eyebrow: "Signed in",
      welcome: (firstName: string) => `Welcome, ${firstName}`,
      welcomeBack: (firstName: string) => `Welcome back, ${firstName}`,
      body: "Opening Today…",
    },
  },
} as const;

const DEVICE_KIND: Record<DeviceKind, string> = {
  monitor: "Screen",
  tablet: "Tablet",
  smartphone: "Phone",
};

function ambientRangeText(range: AmbientRange | null): string {
  return range === null ? "Not set" : `${range.start} – ${range.end}`;
}

function ambientSummaryText(summary: AmbientSummary): string {
  if (summary.mode === "off") return "Off";

  if (summary.mode === "same") return ambientRangeText(summary.all);

  return `Sun – Thu ${ambientRangeText(summary.all)} · Fri & Sat ${ambientRangeText(summary.wknd)}`;
}

function screenName({ kind, browser }: Device): string {
  const noun = DEVICE_KIND[kind];

  return browser === null ? noun : `${browser} ${noun.toLowerCase()}`;
}

function activeText(stamp: ActiveStamp): string {
  switch (stamp.kind) {
    case "minutes":
      return `Active ${stamp.count} min ago`;
    case "hours":
      return `Active ${stamp.count} hr ago`;
    case "yesterday":
      return "Active yesterday";
    case "on":
      return `Active ${stamp.date}`;
  }
}
