import type { AmbientRange, AmbientSummary } from "@/domain/idle";
import type { AccountSettings, Season, TagColor, WeatherIcon } from "@/domain/schemas";
import type { ActiveStamp, Device, DeviceKind } from "@/domain/screens";
import type { Clock } from "@/domain/time";
import type { ScheduleCount } from "@/domain/todaySchedule";
import type { WmoCondition } from "@/domain/wmo";

type NoteExpiry = AccountSettings["noteExpiry"];

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
    openMenu: "Open menu",
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
      until: (end: string) => `until ${end}`,
      started: (start: string) => `started ${start}`,
      left: (length: string) => `${length} left`,
      in: (length: string) => `In ${length}`,
      loading: "Loading calendar",
    },
    open: {
      eyebrow: "Today · Open",
      wrapTitle: "That’s a wrap for today",
      wrapBody: (done: number, until: string) =>
        `${done} ${done === 1 ? "event" : "events"} done · free until ${until}`,
      wideTitle: "The day is wide open",
      wideBody: (until: string, left?: string) =>
        left ? `Free until ${until} · ${left}` : `Free until ${until}`,
      now: (time: string) => `Now ${time}`,
      sunset: "Sunset",
    },
    schedule: {
      count: ({ left, total }: ScheduleCount, short: boolean) => {
        if (total === 0) return short ? "No events" : "Today · No events";

        if (left === 0) return short ? "All done" : "Today · All done";

        return short ? `${left} left today` : `Today · ${left} of ${total} left`;
      },
      earlier: (done: number) => `Earlier · ${done} done`,
      hideEarlier: "Hide earlier",
      comingUp: "Coming up",
      nothingAhead: "Nothing else on the calendar yet.",
      tomorrow: "Tomorrow",
      day: (weekday: string, monthDay: string) => `${weekday}, ${monthDay}`,
      allDay: "All day",
      upcomingName: (title: string, day: string, time: string, who: string) =>
        `${title}, ${day}, ${time}, ${who}`,
      loadingCount: "Today · Loading",
      failedCount: "Today",
      addEvent: "Add event",
      fullCalendar: "Full calendar",
      loading: "Loading events",
    },
    photo: {
      eyebrow: "Today’s photo",
      onThisDay: "On this day",
      name: (parts: readonly string[]) => `Today’s photo: ${parts.join(", ")}`,
      addPhoto: "Add photo",
      allPhotos: "All photos",
      more: (count: number) => `${count} more photo${count === 1 ? "" : "s"}`,
      moreName: (label: string) => `${label}, open Photos`,
      loading: "Loading today’s photo",
      failed: "Photo didn’t load",
      offline: "Shows when back online",
      upload: {
        title: "Your first photo is on its way",
        name: (percent: number) => `First photo uploading, ${percent}%. Open Photos`,
        one: (percent: number) => `Uploading · ${percent}%`,
        several: (count: number, percent: number) => `${count} photos · ${percent}%`,
        waiting: "Waiting",
        paused: "Paused · offline",
      },
      empty: {
        title: "A memory to share?",
        body: (moments: string) => `${moments}. Add family photos and one shows here each day.`,
        moments: [
          "Sunday pancakes",
          "the first snow",
          "a birthday cake",
          "pizza night",
          "the first day of school",
          "a day at the beach",
          "camping by the lake",
        ],
        fromPhone: "Add from your phone",
        fromPhoneName: "Add photos from your phone",
        addPhotos: "Add photos",
      },
      qr: {
        name: "Add photos from your phone",
        code: "Code to add photos from your phone",
        title: "Scan to add photos",
        body: "Point your phone’s camera at the code. The photos you pick show on every screen.",
        chooseFiles: "Choose files here",
        done: "Done",
      },
    },
    weather: {
      name: "Weather now",
      now: (city: string) => `${city} · Now`,
      summary: (condition: string, high: number, low: number) =>
        `${condition} · High ${high}° · Low ${low}°`,
      highLow: (high: number, low: number) => `High ${high}° · Low ${low}°`,
      rainFrom: (time: string) => `Rain from ${time}`,
      setTitle: "Set weather location",
      setBody: "The forecast and the clock follow it.",
      failedBody: (minutes: number) => `Trying again in ${minutes} min.`,
      loading: "Loading weather",
    },
    notes: {
      count: (count: number) => `Notes · ${count}`,
      eyebrow: "Notes",
      allNotes: "All notes",
      more: (count: number) => (count === 1 ? "1 more note" : `${count} more notes`),
      moreName: (more: string) => `${more}, open Notes`,
      noteName: (author: string, text: string) =>
        author ? `Note from ${author}: ${text}` : `Note: ${text}`,
      emptyTitle: "Something to share at home?",
      emptyBody: "Milk in the fridge, flowers to water. Leave a note for the family.",
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
    more: "More",
    moreName: (count: number, range: string, opensCalendar: boolean) =>
      `${count} more ${count === 1 ? "plan" : "plans"}, ${range}. ${opensCalendar ? "Open calendar" : "Show details"}`,
    longPlans: "Long plans",
  },
  calendar: {
    previousWeek: "Previous week",
    nextWeek: "Next week",
    week: (month: string, day: number) => `Week of ${month} ${day}`,
    weekRange: ({ from, to, year }: { from: string; to: string; year: string | undefined }) =>
      year ? `${from} – ${to}, ${year}` : `${from} – ${to}`,
    eventCount: (count: number) => `${count} ${count === 1 ? "event" : "events"}`,
    showAllHours: (outside: number) => {
      if (outside === 0) return "Show all 24 hours";

      return `Show all 24 hours · ${outside} more ${outside === 1 ? "plan" : "plans"}`;
    },
    showDayHours: (clock: Clock) =>
      clock === "24h" ? "Show 05:00 – 21:00 only" : "Show 5 AM – 9 PM only",
    addEvent: "Add event",
    emptyTitle: "The calendar is empty",
    emptyBody: "Select a day, then add an event. Days with plans get a dot for each person.",
    updated: (time: string) => `Updated ${time}`,
    loading: "Loading events",
    unavailable: "Calendar unavailable",
    pickDate: "Pick a date",
    pickDateFor: (day: string) => `${day}. Pick a date`,
    previousMonth: "Previous month",
    nextMonth: "Next month",
    weekdayLetters: ["S", "M", "T", "W", "T", "F", "S"],
    today: "Today",
    close: "Close",
    goToday: "Go to today",
    showEarlier: (count: number) => `Show ${count} earlier`,
    hideEarlier: "Hide earlier",
    happeningNow: "Happening now",
    laterToday: (count: number) => (count > 0 ? `Later today · ${count}` : "Later today"),
    nothingScheduled: "Nothing scheduled.",
    nobodySelected: "No one selected, so no plans show.",
  },
  personFilter: {
    everyone: "Everyone",
    nobody: "No one",
    people: (count: number) => `${count} people`,
    members: (count: number) => `${count} ${count === 1 ? "member" : "members"}`,
    title: "Show plans for",
    change: (label: string) => `Show plans for: ${label}. Change`,
    more: (count: number) => `+${count}`,
    close: "Close",
    done: "Done",
  },
  discard: {
    title: "Discard changes?",
    keepEditing: "Keep editing",
    discard: "Discard",
    newEvent: "This event won’t be added.",
    editEvent: "Your edits to this event won’t be saved.",
    note: "This note won’t be posted.",
    photo: "Your edits to this photo won’t be saved.",
  },
  tags: {
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
    } satisfies Record<TagColor, string>,
  },
  reminder: {
    options: [
      { value: "off", label: "Off" },
      { value: "start", label: "At start" },
      { value: "15min", label: "15 min" },
      { value: "both", label: "Both" },
    ],
    strip: {
      label: "Reminder",
      in: (minutes: number) => `In ${minutes} min`,
      now: "Now",
      span: (start: string, end: string) => `${start} – ${end}`,
      count: (count: number) => `${count} events`,
      eyebrow: (parts: readonly (string | undefined)[]) => parts.filter(Boolean).join(" · "),
      titles: (titles: readonly string[], more: number) =>
        [...titles, ...(more > 0 ? [`+${more} more`] : [])].join(", "),
      details: "Details",
      seeAll: "See all",
    },
    push: {
      soon: (what: string) => `${what} in 15 min`,
      now: (what: string) => `${what} starting now`,
    },
  },
  events: {
    now: "Now",
    allDay: "All day",
    everyone: "Everyone",
    preview: {
      noForecast: "No forecast for this date yet.",
      dayHigh: "High for the day",
      rain: (percent: number) => `${percent}% rain`,
      also: (count: number) => (count > 0 ? `Also at this time · ${count}` : "Also at this time"),
      nothing: "Nothing else at this time.",
      hourly: "Hourly forecast",
      hour: (time: string, condition: string, temp: string) =>
        `${time}, ${condition}, ${temp} degrees`,
      label: (day: string, when: string) => `${day} · ${when}`,
    },
    sheet: {
      newTitle: "New event",
      editTitle: "Edit event",
      back: "Back",
      title: "Title",
      titlePlaceholder: "What’s happening",
      where: "Where",
      wherePlaceholder: "Home, school, park…",
      who: "Who",
      notes: "Notes",
      notesPlaceholder: "Anything to remember",
      reminder: "Reminder",
      reminderDefault: "Default from Settings",
      add: "Save event",
      save: "Save",
      saveOffline: "Save for later",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete: "Delete event?",
      addTitle: "Add a title",
      offlineTitle: "You’re offline",
      offlineBody: "Changes save on this screen and sync when the connection is back.",
    },
    who: {
      people: "People on this event",
      addPerson: "Add a person",
      addSomeoneElse: "Add someone else",
      remove: (name: string) => `Remove ${name}`,
      removeEveryone: "Remove everyone",
      suggestions: "Suggestions",
      newMember: "New member",
      addMember: "Add member",
      memberColor: "Member color",
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
    quickDate: {
      change: (day: string) => `${day}. Change date`,
      label: "Change date",
      today: "Today",
      tomorrow: "Tomorrow",
      nextWeek: "Next week",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    },
    time: {
      starts: "Starts",
      ends: "Ends",
      startGroup: "Start time",
      endGroup: "End time",
      change: "Change",
      noEnd: "No end time",
      offAllDay: "off for all-day events",
      endsBeforeStart: "Ends before it starts",
      hour: "Hour",
      minutes: "Minutes",
      meridiem: "AM or PM",
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
    justNow: "Just now",
    waitingToPost: "Waiting to post",
    board: "Notice board",
    count: (count: number, expiry: NoteExpiry) => {
      if (count === 0) return "No notes";

      const notes = count === 1 ? "1 note" : `${count} notes`;

      return `${notes} · ${expiry.on ? `cleared after ${dayCount(expiry.days)}` : "kept until deleted"}`;
    },
    loadingCount: "Loading",
    failedCount: "Notes",
    addNote: "Add note",
    loading: "Loading notes",
    unavailable: "Notes unavailable",
    noteName: (author: string, time: string, text: string) =>
      author ? `Note from ${author}, ${time}: ${text}` : `Note, ${time}: ${text}`,
    addFirst: "Add the first note",
    emptyTitle: "Something to share at home?",
    emptyBody:
      "Fresh milk in the fridge, flowers to water, a pickup at 5. Tap the pad and leave a note for the family.",
    byline: (author: string, time: string) => (author ? `${author} · ${time}` : time),
    details: {
      title: (author: string) => (author ? `Note from ${author}` : "Note"),
      edit: "Edit",
    },
    sheet: {
      newTitle: "New note",
      editTitle: "Edit note",
      close: "Close",
      message: "Message",
      messagePlaceholder: "Leave a note for the family",
      writeMessage: "Write a message",
      name: "From",
      namePlaceholder: "Your name",
      post: "Post note",
      save: "Save",
      saveOffline: "Save for later",
      boardShows: "Board shows the first 120",
      delete: "Delete",
      confirmDelete: "Delete note",
      offlineTitle: "You’re offline",
      offlineBody: "The note saves on this screen and posts when the connection is back.",
    },
  },
  photos: {
    count: (count: number) => `Photos · ${count}`,
    list: "Family photos",
    upload: "Upload",
    uploadPhotos: "Upload photos",
    picker: "Choose photos",
    emptyTitle: "No photos yet",
    emptyBody:
      "Upload family photos to show them here, as the picture of the day and as a background.",
    waitingForUploads: "Your photos show here once they finish uploading.",
    setBackground: "Set as background",
    backgroundNow: "Background now · Change",
    previous: "Previous photo",
    next: "Next photo",
    pause: "Pause slideshow",
    play: "Play slideshow",
    show: (title: string) => `Show ${title}`,
    noDate: "No date",
    datedInYear: (monthDay: string, year: number) => `${monthDay}, ${year}`,
    edit: "Edit details",
    delete: "Delete",
    confirmDelete: "Delete photo",
    cancelDelete: "Cancel",
    deleteName: "Delete this photo?",
    slideshow: "Slideshow",
    qr: {
      name: "Add photos from your phone",
      code: "Code to add photos from your phone",
      title: "Scan to add photos",
      body: "Point your phone’s camera at the code and pick photos. They show here as they finish uploading.",
      chooseFiles: "Choose files here",
      done: "Done",
    },
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
      file: (name: string) => `File: ${name}`,
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
      notUploaded: "Not uploaded",
      failedName: (title: string, reason: string) => `${title}: ${reason}`,
      short: {
        "too-large": "Over 20 MB",
        "not-a-photo": "Not a photo",
        "storage-full": "Storage full",
        network: "Failed",
      },
      failed: {
        "too-large": "Too large · 20 MB max",
        "not-a-photo": "Not a photo",
        "storage-full": "Storage full · delete photos to make room",
        network: "Didn’t upload",
      },
    },
    row: {
      uploadingOne: (title: string) => `Uploading ${title}`,
      uploadingMany: (count: number) => `Uploading ${count} photos`,
      failed: (count: number) =>
        count === 1 ? "1 photo didn’t upload" : `${count} photos didn’t upload`,
      storageFull: "Storage full",
      retryAll: "Try again",
      clear: "Clear",
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
    hideSidebar: {
      title: "Hide sidebar when idle",
      body: "After 15 seconds without a touch. Any tap brings it back.",
    },
    notifications: {
      title: "Notifications",
      defaultReminder: "Default reminder",
      chime: "Chime",
      chimeBody: "Plays once when a reminder shows. Never during quiet hours.",
      thisPhone: "This phone",
      thisPhoneBody: "Get reminders when Glance is closed.",
      allow: "Allow notifications",
      on: "On",
      turnOff: "Turn off",
      blocked: "Notifications are off for Glance in this browser’s settings.",
    },
    idle: {
      title: "Back to Today after",
      value: (minutes: number) => `${minutes} min`,
      on: "without a touch",
      off: "Off · stays on the current view",
      slider: "Minutes before going back to Today",
    },
    noteExpiry: {
      title: "Remove notes after",
      value: (days: number) => dayCount(days),
      on: "after posting",
      off: "Off · notes stay until deleted",
      slider: "Days before notes are removed",
    },
    account: {
      title: "Account",
      screensSignedIn: (count: number) =>
        count === 1 ? "1 screen signed in" : `${count} screens signed in`,
      deviceKind: (kind: DeviceKind) => DEVICE_KIND[kind],
      screenName: (device: Device) => screenName(device),
      thisScreen: "This screen",
      active: (stamp: ActiveStamp) => activeText(stamp),
      storage: {
        title: "Photo storage",
        left: (left: number, unit: "GB" | "MB") => `${left} ${unit} left`,
        noneLeft: "No space left",
        used: (used: number, limit: number) => `${used} GB of ${limit} GB used`,
        meter: "Photo storage used",
        ok: "Shared by every screen on this account.",
        almost: "Almost full. Delete photos in Photos to make room.",
        full: "Storage full. New photos can’t be added until some are deleted in Photos.",
      },
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
    wakeLine: ({ on, minutes }: AccountSettings["idleTimeout"]) =>
      on
        ? `After a touch it dims again when nobody has touched it for ${minutes} min.`
        : "After a touch it stays awake until the next ambient start.",
    wakeLineOff: "Touch-to-wake and the idle timer work as usual.",
    brightness: "Brightness",
    brightnessLevels: [
      { value: "full", label: "Full" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
    brightnessBody:
      "How bright the text is while dimmed. On screens that allow it, the backlight dims too.",
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
    hint: "Tap anywhere to wake",
    hintSignedOut: "Tap anywhere to sign in",
    offline: "Offline · showing saved data",
    signedOut: "Signed out · tap to sign in",
    now: (temp: number, condition: string) => `${temp}° · ${condition}`,
    low: (low: number) => `Low ${low}° overnight`,
    rain: (day: string, precip: number) => `${day} ${precip}% rain`,
    updated: (time: string) => `Updated ${time}`,
    nextEvent: "Next event",
    nothing: "Nothing scheduled",
    addEvents: "Add events from Today",
    addEventsAndLocation: "Add events and a location from Today",
    tomorrow: "Tomorrow",
    allDay: "All day",
    day: (weekday: string, monthDay: string) => `${weekday}, ${monthDay}`,
    next: (day: string, start: string) => `Next · ${day} · ${start}`,
    loadingWeather: "Loading weather",
    loadingEvent: "Loading next event",
  },
  signIn: {
    headline: "Your family’s day, at a glance.",
    tagline: "Calendar, weather, notes and photos for your family. Sign in to manage them.",
    shortDate: (weekday: string, monthDay: string) => `${weekday}, ${monthDay}`,
    preview: {
      eyebrow: "Today · 3 events",
      events: [
        { start: "8:00", title: "School drop-off", status: "past" },
        { start: "10:30", title: "Piano lesson", status: "now" },
        { start: "4:30 PM", title: "Soccer practice", status: "upcoming" },
      ],
      temperature: "64°",
      rain: "Rain moving in after 4 PM",
      note: "Soccer cleats are by the door",
      noteAuthor: "Mom",
      noteTime: "8:12 AM",
    },
    lock: "Only your family can see its calendar, notes and photos.",
    form: {
      eyebrow: "One account per family",
      title: "Sign in or get started",
      body: "Enter your email. We’ll send a 6-digit code to sign this screen in. New here? The same code sets up your family’s Glance.",
      label: "Email",
      placeholder: "name@example.com",
      send: "Send code",
      sending: "Sending…",
      sendingTo: "Sending a code to ",
      invalid: "Enter a valid email address",
      failed: "Couldn’t send. Try again.",
      offlineTitle: "You’re offline",
      offlineBody:
        "A code can’t be sent right now. Sending turns back on when the screen reconnects.",
    },
    ended: {
      notice: "This screen was signed out",
      noticeBody: "Sign in again to keep the calendar, notes and photos up to date.",
      waiting: (count: number) => `Changes waiting on this screen: ${count}.`,
      sentAfter: "They’ll be sent after you sign in.",
      title: "Sign in again",
      body: "Check your family’s email below. We’ll send a code that signs this screen back in.",
      switchBefore: "Changes waiting on this screen belong to ",
      switchAfter: ". They’ll be removed from this screen if a different email signs in.",
      previousEmail: (email: string) => `Use ${email}`,
    },
    eyebrow: "Sign in",
    code: {
      title: "Enter the code",
      before: "We sent a 6-digit code to ",
      after: ". It works once, for 10 minutes.",
      label: "Code",
      submit: "Sign in",
      checking: "Checking…",
      wrong: "That code isn’t right. Try again.",
      locked: "Too many tries. Send a new code.",
      offlineTitle: "You’re offline",
      offlineBody:
        "The code can’t be checked right now. Sign in turns back on when the screen reconnects.",
    },
    differentEmail: "Use a different email",
    waitFor: (seconds: number) =>
      `New code or different email in 0:${String(seconds).padStart(2, "0")}`,
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
    expired: {
      title: "This code has expired",
      before: "Codes work for 10 minutes. Send a new one to ",
      after: ".",
    },
    resend: "Send a new code",
    email: {
      subject: "Your Glance sign-in code",
      preheader: (code: string) => `${code} is your Glance code. It works once, for 10 minutes.`,
      header: "Glance",
      eyebrow: "Sign-in code",
      title: "Your sign-in code",
      body: "Enter this code on the Glance screen that asked for it. New here? The same code sets up your family’s Glance.",
      expires: "Works once, for 10 minutes",
      warning:
        "Glance never asks for this code by phone, text or email. Only type it on your Glance screen.",
      ignoreTitle: "Didn’t ask for this?",
      ignoreBody: "You can ignore this email. No one can sign in without this code.",
      sentToBefore: "Sent to ",
      sentToAfter: " because it was entered on a Glance screen.",
      tagline: "Glance · Calendar, weather, notes and photos for your family.",
    },
    done: {
      eyebrow: "Signed in",
      welcome: (firstName: string) => `Welcome, ${firstName}`,
      welcomeBack: (firstName: string) => `Welcome back, ${firstName}`,
      body: "Opening Today…",
      bodyPhotos: "Opening Photos…",
    },
  },
} as const;

const DEVICE_KIND: Record<DeviceKind, string> = {
  monitor: "Screen",
  tablet: "Tablet",
  smartphone: "Phone",
};

function dayCount(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

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
