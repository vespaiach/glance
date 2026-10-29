import type { EventWord, SentenceJoin } from "@/domain/eventSentence";
import type { StatusTitle } from "@/domain/eventStatus";
import type { AmbientRange, AmbientSummary } from "@/domain/idle";
import type { AccountSettings, Season, TagColor, WeatherIcon } from "@/domain/schemas";
import type { ActiveStamp, Device, DeviceKind } from "@/domain/screens";
import type { Clock } from "@/domain/time";
import type { ScheduleCount } from "@/domain/todaySchedule";
import type { WmoCondition } from "@/domain/wmo";

type NoteExpiry = AccountSettings["noteExpiry"];

export type TermsPart = string | { text: string; href: string } | { strong: string };

export type TermsBlock = string | readonly TermsPart[] | { list: readonly string[] };

const GITHUB = "https://github.com/vespaiach/glance";
const OPEN_METEO = "https://open-meteo.com/";

const CONTACT = { text: "nta.toan@gmail.com", href: "mailto:nta.toan@gmail.com" };

export const copy = {
  appName: "Glance",
  zone: {
    updated: (label: string, time: string) => `${label} · Updated ${time}`,
    failedBody: (minutes: number) =>
      `The Glance server isn’t responding. Trying again in ${minutes} min.`,
    retry: "Try again",
  },
  crash: {
    title: "Something went wrong",
    body: (seconds: number) => `Glance will reload in ${seconds} s.`,
    stuck: "Glance keeps running into this problem. Tap Reload to try again.",
    reload: "Reload",
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
    removal: {
      deleted: (count: number) =>
        `Their ${count} ${count === 1 ? "plan is" : "plans are"} deleted.`,
      stripped: (count: number) =>
        `They’re taken off ${count} ${count === 1 ? "plan" : "plans"} shared with others.`,
      none: "They have no plans.",
    },
  },
  reminder: {
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
      soon: (what: string, minutes: number) => `${what} in ${minutes} min`,
    },
  },
  events: {
    now: "Now",
    allDay: "All day",
    everyone: "Everyone",
    page: {
      summary: "Event summary",
      fields: {
        title: "What’s happening",
        day: "Day",
        start: "Starts",
        end: "Ends",
        who: "Who it’s for",
        where: "Where",
        notes: "Notes",
      } satisfies Record<EventWord, string>,
      joins: {
        on: " on ",
        space: " ",
        from: " from ",
        at: " at ",
        to: " to ",
        for: " for ",
        comma: ", ",
        commaFor: ", for ",
      } satisfies Record<SentenceJoin, string>,
      period: ".",
      titlePlaceholder: "What’s happening",
      wherePlaceholder: "a place",
      allDay: "all day",
      every: (weekday: string) => `every ${weekday}`,
      repeatsFrom: (day: string) => `Every week · from ${day}`,
      everyone: "everyone",
      nobody: "no one",
      people: (names: readonly string[], others: number) => peopleText(names, others),
      others: (count: number) => `${count} others`,
      and: " and ",
      comma: ", ",
      notSet: "not set",
      change: (field: string, value: string) => `${field}: ${value}. Change`,
      edit: (field: string, value: string) => `${field}: ${value}. Edit`,
      addNotes: "Add notes",
      notesPreview: (notes: string) =>
        `Notes: ${notes.length > 26 ? `${notes.slice(0, 25).trim()}…` : notes}`,
      addEnd: "Add end time",
      sameTime: "Same time:",
      sameTimeText: (names: string, one: boolean, title: string, range: string, more: number) =>
        `${names} ${one ? "is" : "are"} also at ${title}, ${range}${more > 0 ? ` · ${more} more` : ""}`,
      sameTimeEveryone: "Everyone",
      notification: "Notification",
      notificationName: (on: boolean) =>
        on ? "Notification on. Turn off" : "Notification off. Turn on",
      notificationOff: "Notification off",
      ended: "This event has ended and can’t be changed.",
      newTitle: "New event",
      editTitle: "Edit event",
      status: (status: StatusTitle, length: (minutes: number) => string) =>
        statusText(status, length),
      save: "Save",
      saveNew: "Save event",
      saveOffline: "Save for later",
      delete: "Delete",
      deleteEvent: "Delete event",
      keep: "Keep",
      editAction: "Edit",
      back: "Back",
    },
    series: {
      eyebrow: (weekday: string) => `Repeats every ${weekday}`,
      deleteTitle: "Delete a repeating event?",
      saveTitle: "Save changes to a repeating event?",
      deleteBody: (title: string, weekday: string, date: string) =>
        `${title} repeats every ${weekday}. Delete only the one on ${date}, or every event in the series.`,
      saveBody: (title: string, weekday: string, date: string) =>
        `${title} repeats every ${weekday}. Apply your changes to ${date} only, or to every event in the series.`,
      untitled: "This event",
      one: "This event only",
      all: "All events in the series",
      keepEvent: "Keep event",
      keepEditing: "Keep editing",
    },
    picker: {
      next: "Next",
      nextTo: (field: string) => `Next: ${field}`,
      endsLength: (length: string) => `Ends · ${length}`,
      allDay: "All day",
      recent: "Recent",
      recentPlaces: "Recent places",
      titlePlaceholder: "What’s happening",
      wherePlaceholder: "Home, school, park…",
      notesPlaceholder: "Anything to remember",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      weekdays: ["S", "M", "T", "W", "T", "F", "S"],
      dayCell: (name: string, today: boolean, repeats: boolean) =>
        `${name}${today ? ", today" : ""}${repeats ? ", repeats" : ""}`,
      howOften: "How often",
      oneDay: "One day",
      everyWeek: "Every week",
      hour: "Hour",
      minutes: "Minutes",
      meridiem: "AM or PM",
      length: "Length",
      noEnd: "No end time",
      hour24Cell: (hour: string) => `${hour} hundred`,
      minuteCell: (minutes: string) => `${minutes} minutes`,
      lengths: [
        { value: 30, label: "30 min" },
        { value: 60, label: "1 hr" },
        { value: 90, label: "1 hr 30" },
        { value: 120, label: "2 hr" },
      ],
      addPerson: "Add a person",
    },
    preview: {
      noForecast: "No forecast for this date yet.",
      dayHigh: "High for the day",
      rain: (percent: number) => `${percent}% rain`,
      also: (count: number) => (count > 0 ? `Also at this time · ${count}` : "Also at this time"),
      nothing: "Nothing else at this time.",
      alsoDay: (count: number) => (count > 0 ? `Also that day · ${count}` : "Also that day"),
      nothingDay: "Nothing else that day.",
      forecast: (day: string) => `Forecast · ${day}`,
      facts: "Forecast and other plans",
      hourly: "Hourly forecast",
      hour: (time: string, condition: string, temp: string) =>
        `${time}, ${condition}, ${temp} degrees`,
      label: (day: string, when: string) => `${day} · ${when}`,
    },
    who: {
      suggestions: "Suggestions",
      newMember: "New member",
      addMember: "Add member",
      memberColor: "Member color",
    },
    swatches: {
      spring: ["Lime", "Pink", "Mint", "Lilac", "Cream"],
      summer: ["Sun", "Coral", "Sky", "Lime", "Cream"],
      fall: ["Amber", "Rust", "Sage", "Coral", "Cream"],
      winter: ["Ice", "Lilac", "Glacier", "Mint", "Frost"],
    } satisfies Record<Season, readonly [string, string, string, string, string]>,
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
  imports: {
    untitled: "Untitled event",
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
    emptyBody: "Upload family photos to show them here, as Today’s photo and as a background.",
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
    importEvents: {
      title: "Import events",
      body: "Add events from an .ics calendar file",
      last: (date: string) => `Last: ${date}`,
    },
    exportEvents: {
      title: "Export events",
      body: "Saves upcoming events as an .ics file · past events are left out",
      upcoming: (n: number) =>
        n === 0 ? "No upcoming events" : `${n} upcoming ${n === 1 ? "event" : "events"}`,
      saved: (n: number) => `Saved ${n} ${n === 1 ? "event" : "events"} · glance-events.ics`,
      offline: "Offline · needs a connection",
      download: "Download .ics",
      fileName: "glance-events.ics",
      forWho: (names: string) => `For: ${names}`,
      everyone: "Everyone",
    },
    dataAndApp: {
      title: "Data and app",
      refresh: {
        title: "Refresh data",
        body: "Gets the latest events, notes, photos and weather from the server now.",
        button: "Refresh",
        busyButton: "Refreshing",
        busy: "Getting the latest data",
        failed: "Couldn’t reach the server. Try again.",
        updated: (minutes: number) =>
          minutes < 1 ? "Updated just now" : `Updated ${minutes} min ago`,
        offline: (minutes: number | undefined) =>
          minutes === undefined
            ? "Offline"
            : `Offline · ${minutes < 1 ? "updated just now" : `updated ${minutes} min ago`}`,
      },
      reload: {
        title: "Reload app",
        body: "Restarts the app from the server, for example to load a new version. Settings, events and notes stay.",
        button: "Reload",
        upToDate: (version: string) => `Version ${version} · up to date`,
        ready: (next: string, current: string) =>
          `Version ${next} is ready · this screen runs ${current}`,
        offline: "Offline · needs a connection",
        confirm: "The screen goes blank for a few seconds, then opens on Today.",
        cancel: "Cancel",
        reloadNow: "Reload now",
        coverTitle: "Reloading Glance",
        coverBody: "Getting the latest version from the server. This takes a few seconds.",
        version: (version: string) => `Version ${version}`,
      },
    },
    apiKey: {
      title: "API key",
      body: "Lets other apps read, add and update events · one key per account",
      endpoint: (host: string) => `GET · POST · PATCH · DELETE ${host}/api/v1/events`,
      create: "Create key",
      masked: (tail: string) => `glc_live_••••${tail}`,
      used: (stamp: ActiveStamp | null) => `· ${usedText(stamp)}`,
      revoke: "Revoke",
      offline: "Offline · needs a connection",
      ask: "Apps using this key stop working right away.",
      cancel: "Cancel",
      confirm: "Revoke key",
      shownTitle: "Copy this key now",
      shownBody:
        "It’s shown only once. Anyone with it can see, add and change events on this calendar.",
      copy: "Copy",
      copied: "Copied",
      done: "Done",
    },
    season: {
      title: "Season",
      autoLabel: "Auto",
      following: (season: string) => `Follows the month · now ${season}`,
      fixed: (season: string) => `Fixed to ${season}`,
    },
    background: {
      title: "Background",
      body: "Season drawing, photo, slideshow or blank",
      season: (season: string) => `Season drawing · ${season}`,
      blank: "Blank",
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
      group: "Notifications for everyone",
      options: [
        { value: "off" as const, label: "Off" },
        { value: 15 as const, label: "15 min before" },
        { value: 30 as const, label: "30 min before" },
      ],
      sub: (lead: "off" | 15 | 30) =>
        lead === "off"
          ? "Off for everyone, whatever each event is set to"
          : `${lead} min before each event, on this screen and on phones`,
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
    family: {
      eyebrow: (count: number) => `Family · ${count} ${count === 1 ? "member" : "members"}`,
      list: "Family members",
      plans: (count: number) =>
        count === 0 ? "No plans" : `${count} ${count === 1 ? "plan" : "plans"}`,
      remove: "Remove",
      removeName: (name: string) => `Remove ${name}`,
      cancel: "Cancel",
      lastMember: "The last member can’t be removed.",
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
      signOutCaption: "This device or every device.",
      signOutDialog: {
        title: "Sign out",
        body: "Sign out of this screen only, or of every phone, tablet and screen signed in with this email. Calendars, notes and photos stay saved to the account.",
        thisDevice: "Sign out this device",
        allDevices: "Sign out all devices",
        cancel: "Cancel",
        failed: "Couldn’t sign out. Try again.",
      },
      guide: "Guide",
      terms: "Terms of Service",
      deleteAccount: {
        title: "Delete account",
        caption:
          "Erases every event, note, photo and family member for everyone, and signs out all screens.",
      },
      deleteDialog: {
        title: "Delete account?",
        body: "Everything saved to this account is erased for the whole family. This can’t be undone.",
        erased: "What gets erased",
        events: "Events",
        notes: "Notes",
        photos: "Photos",
        tags: "Family members",
        screens: "Signed-in screens",
        loading: "–",
        understand: "I understand everything will be erased for good.",
        erasing: "Erasing events, notes and photos. Keep this screen on.",
        confirm: "Delete account",
        deleting: "Deleting…",
        keep: "Keep account",
        failedTitle: "Couldn’t delete the account",
        failedBody: "Nothing was erased. Try again.",
        retry: "Try again",
      },
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
  import: {
    everyone: "Everyone",
    back: "Back",
    backToSettings: "Back to settings",
    close: "Close",
    range: (from: string, to: string) => `${from} – ${to}`,
    source: {
      title: "Import events",
      eyebrow: "Step 1 of 2",
      headline: "Add events from a file",
      body: "Use an .ics file from a school, team or other calendar app. Events are copied in once; later changes to the file don’t sync.",
      last: (date: string) => `Last import · ${date}`,
      lastLine: (count: number, who: string) =>
        `${count} ${count === 1 ? "event" : "events"} for ${who}`,
      undo: "Undo",
      limits: ".ics only · up to 5 MB · 1,000 events",
      phone: "Send from phone",
      phoneHint: "Scan a code, then pick the file on your phone",
      file: "Choose file",
      fileHint: "From this device",
    },
    phone: {
      title: "Send from phone",
      code: "QR code to send a file from your phone",
      waiting: (endsIn: string) => `Waiting for a file · code ends in ${endsIn}`,
      headline: "Scan to send a file",
      steps: [
        "Scan the code with your phone camera",
        "Pick the .ics file on the page that opens",
        "Review the events here on the screen",
      ],
      newCode: "New code",
    },
    review: {
      title: "Review import",
      eyebrow: "Step 2 of 2",
      found: (count: number) => `${count} ${count === 1 ? "event" : "events"} found`,
      file: (range: string, bytes: number) =>
        `${range} · ${Math.max(1, Math.round(bytes / 1024))} KB`,
      change: "Change",
      who: "Who these are for",
      skipped: (duplicates: number) => {
        const past = "Past events aren’t imported.";

        if (duplicates === 0) return past;

        const are = duplicates === 1 ? "is" : "are";

        return `${duplicates} ${are} already on the calendar and will be skipped. ${past}`;
      },
      all: (count: number) => `All events · ${count}`,
      allDay: "All day",
      weekly: (time: string) => `${time} · Every week`,
      duplicate: (title: string) => `${title} · already added`,
      run: (count: number) => (count === 1 ? "Import 1 event" : `Import ${count} events`),
      running: "Importing…",
    },
    done: {
      title: "Imported",
      added: (count: number) => (count === 1 ? "1 event added" : `${count} events added`),
      line: (who: string, range: string, duplicates: number) => {
        const lead = `For ${who} · ${range}.`;

        if (duplicates === 0) return lead;

        return `${lead} ${duplicates} ${duplicates === 1 ? "duplicate" : "duplicates"} skipped.`;
      },
      undoNote: "Undo stays in Settings › Import events for 24 hours",
      undo: "Undo import",
      openCalendar: "Open calendar",
    },
    errors: {
      type: {
        title: "This isn’t a calendar file",
        body: "Choose a file that ends in .ics. Export one from the calendar app’s settings.",
        action: "Choose again",
      },
      empty: {
        title: "No upcoming events in this file",
        body: "Every event in it has already happened, so there’s nothing to add.",
        action: "Choose another file",
      },
      offline: {
        title: "Couldn’t import",
        body: "The screen is offline. Nothing was added. Try again when it’s back online.",
        action: "Try again",
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
      { value: "season", label: "Season" },
      { value: "photo", label: "Photo" },
      { value: "slideshow", label: "Slideshow" },
      { value: "blank", label: "Blank" },
    ],
    drawings: "Season drawings",
    selectDrawing: "Season drawings · select one",
    drawingNow: (season: string) => `${season} · now`,
    pickDrawing: (season: string) => `Use ${season} drawing as background`,
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
      following: (season: string) =>
        `The ${season.toLowerCase()} drawing is the background. It changes with the season until you pick one; panels stay solid on top.`,
      picked: (season: string) =>
        `The ${season.toLowerCase()} drawing is the background on every screen. Panels stay solid on top.`,
      blank: "Screens use a plain light gray background. Pick a photo to switch.",
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
    attribution: { text: "Weather data by Open-Meteo.com", href: OPEN_METEO },
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
    signedOutAll: "Signed out of all devices.",
    accountDeleted: "Account deleted. Everything on it has been erased.",
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
    terms: { before: "By continuing, you agree to the ", link: "Terms of Service", after: "." },
    guide: { before: "New to Glance? Read the ", link: "guide", after: "." },
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
    scan: {
      entry: "Scan code from another screen",
      stale: "That code has expired or was already used. Sign in with your email instead.",
      eyebrow: "Scan to sign in",
      ask: {
        title: "Glance needs the camera",
        body: "The camera reads the code on your Glance screen. Your phone asks next; choose Allow. Nothing is recorded or saved.",
        action: "Continue",
      },
      blocked: {
        title: "Allow camera access in Settings",
        body: "Camera access is off for Glance. Turn it on in your phone’s Settings, then tap Try again.",
        action: "Try again",
      },
      nocam: {
        title: "No camera on this device",
        body: "Sign in with your email instead.",
        action: "Use email",
      },
      cancel: "Cancel",
      title: "Scan to sign in",
      point: "Point at the code on your Glance screen",
      where: "On a signed-in screen, open Settings › Account › Sign in another device.",
      wrong: "That isn’t a Glance code. Keep scanning.",
      found: "Code found",
      signingIn: "Signing in…",
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
      bodyImport: "Opening Import events…",
    },
  },
  terms: {
    wordmark: "Glance",
    source: "Source on GitHub",
    sourceHref: GITHUB,
    back: "Back to Glance",
    eyebrow: "Legal",
    title: "Terms of service",
    effective: "Effective October 24, 2026",
    inShort: "In short",
    cards: [
      { title: "Free and open source", body: "No fees. The code is MIT-licensed and public." },
      {
        title: "Your data, not encrypted",
        body: "Stored in PostgreSQL on VPS servers without encryption. Keep sensitive information out.",
      },
      {
        title: "Provided as is",
        body: "No guarantees of uptime or data safety. The operator is not liable for losses.",
      },
      { title: "18 and over", body: "You must be at least 18 to use Glance." },
    ],
    sections: [
      {
        id: "acceptance",
        title: "Acceptance",
        body: [
          'These terms of service ("Terms") govern your use of Glance, the web app at takeaglance.app (the "Service"). The Service is operated by Trinh Nguyen, an individual (the "Operator").',
          "By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.",
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility",
        body: [
          "You must be at least 18 years old to use the Service. By using it, you confirm that you meet this requirement and can enter into a binding agreement.",
        ],
      },
      {
        id: "service",
        title: "The service",
        body: [
          "Glance shows calendar events, notes, photos and weather on a display. The Service is free of charge.",
          "The Operator may change, suspend or discontinue any part of the Service at any time, with or without notice. There is no guarantee of availability, uptime or support.",
        ],
      },
      {
        id: "open-source",
        title: "Open source",
        body: [
          [
            "The source code for Glance is available at ",
            { text: "github.com/vespaiach/glance", href: GITHUB },
            " under the MIT License. The MIT License governs your use of the code. These Terms govern your use of the hosted Service at takeaglance.app.",
          ],
          "If you run your own copy of Glance, you are responsible for that installation, its data and its users. These Terms do not apply to it.",
        ],
      },
      {
        id: "weather-data",
        title: "Weather data",
        body: [
          [
            "Weather forecasts and current conditions in the Service come from ",
            { text: "Open-Meteo", href: OPEN_METEO },
            ", a third-party weather API. The Operator does not produce, check or control this data.",
          ],
          [
            "Open-Meteo data is licensed under the ",
            {
              text: "Creative Commons Attribution 4.0 International License (CC BY 4.0)",
              href: "https://creativecommons.org/licenses/by/4.0/",
            },
            '. As required by that license, the Service credits the source as "Weather data by Open-Meteo.com" with a link to open-meteo.com wherever weather is shown. Weather values may be rounded, converted between units or summarized for display.',
          ],
          [
            "Open-Meteo combines forecasts from national weather services. Its terms and the full list of data sources are at ",
            { text: "open-meteo.com/en/terms", href: "https://open-meteo.com/en/terms" },
            ". If you reuse weather data shown in Glance, you must give the same attribution.",
          ],
        ],
      },
      {
        id: "account",
        title: "Your account",
        body: [
          "You are responsible for keeping your sign-in details secure and for all activity under your account.",
          "Glance is designed for shared screens. Anything you put on a display can be seen by anyone nearby. You are responsible for what you choose to show.",
        ],
      },
      {
        id: "content",
        title: "Your content",
        body: [
          "Your content includes the calendar events, notes, uploaded photos and display or device settings you add to the Service. You keep ownership of it.",
          "You give the Operator a limited permission to store, process and display your content only as needed to run the Service.",
          "You confirm that you have the right to upload and display your content, including any photos of other people.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        body: [
          "You agree not to:",
          {
            list: [
              "break any law or use the Service for anything illegal",
              "upload content that infringes someone else's rights, or that is abusive, hateful or sexually explicit",
              "upload malware or try to access other accounts, servers or data without permission",
              "overload, disrupt or reverse-engineer the hosted Service",
              "resell or commercially redistribute access to the hosted Service",
            ],
          },
        ],
      },
      {
        id: "data",
        title: "How your data is stored",
        body: [
          "Your content is stored in PostgreSQL databases on virtual private servers (VPS) rented from a third-party hosting provider.",
          [
            { strong: "Your data is not encrypted." },
            " The Service does not encrypt your content in the database or on the servers. Anyone who gains access to those servers, including the hosting provider, could read it.",
          ],
          "Do not store passwords, financial, health, government ID or other sensitive information in Glance.",
          "The Operator does not sell or share anything you enter in Glance (events, notes, photos, names, settings) with anyone, except the hosting provider that runs the servers, or when required by law.",
          "The Service uses Google Analytics to count visits and see which pages are used. Google receives this usage data (pages viewed, browser, device type, approximate location), never what you enter in Glance.",
          "When Glance runs into an error, it sends an error report to the Glance server, where it is kept in the server’s logs. A report holds the error, the page, the app version, when it happened and your time zone, your browser and device, and your IP address with its last part removed, never what you enter in Glance.",
          "Backups are not guaranteed. Keep your own copies of anything you care about.",
        ],
      },
      {
        id: "deletion",
        title: "Deleting your account",
        body: [
          [
            "You can delete your account at any time in Settings, or by emailing ",
            CONTACT,
            " from the address on your account.",
          ],
          "Deleting your account removes your content from the live database. Copies may remain in server backups for a limited time before they are overwritten.",
        ],
      },
      {
        id: "termination",
        title: "Termination",
        body: [
          "The Operator may suspend or close any account, or remove any content, at any time and for any reason, with or without notice. Sections 7, 9 and 12–16 continue to apply after your account ends.",
        ],
      },
      {
        id: "warranties",
        title: "No warranties",
        body: [
          'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, SECURITY OR UNINTERRUPTED OPERATION.',
          "Calendar times, weather forecasts and other information shown may be wrong or out of date. Do not rely on the Service for anything critical.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of liability",
        body: [
          "TO THE FULLEST EXTENT PERMITTED BY LAW, THE OPERATOR IS NOT LIABLE FOR ANY DAMAGES OR LOSSES ARISING FROM YOUR USE OF, OR INABILITY TO USE, THE SERVICE. THIS INCLUDES LOST OR EXPOSED DATA, SECURITY BREACHES, MISSED EVENTS, SERVICE OUTAGES, AND ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, EVEN IF THE OPERATOR WAS TOLD THEY WERE POSSIBLE.",
          "Because the Service is free, the Operator's total liability for any claim is limited to zero US dollars (US $0), or the lowest amount allowed by law.",
          "Some jurisdictions do not allow certain limits on liability. In those places, these limits apply as far as the law allows.",
        ],
      },
      {
        id: "indemnity",
        title: "Indemnification",
        body: [
          "You agree to defend and hold the Operator harmless from any claims, damages, losses or costs, including legal fees, that arise from your content, your use of the Service, or your breach of these Terms.",
        ],
      },
      {
        id: "law",
        title: "Governing law",
        body: [
          "These Terms are governed by the laws of the State of Indiana, USA, without regard to its conflict-of-law rules. Any dispute will be handled in the state or federal courts located in Indiana, and you agree to their jurisdiction.",
        ],
      },
      {
        id: "general",
        title: "Changes and general terms",
        body: [
          "The Operator may update these Terms at any time. Changes are posted on this page with a new effective date. If you keep using the Service after a change, you accept the updated Terms.",
          "These Terms are the entire agreement between you and the Operator about the Service. If any part is found unenforceable, the rest stays in effect. Not enforcing a part of these Terms is not a waiver of it.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        body: [["Questions about these Terms: ", CONTACT]],
      },
    ],
    footer: "Glance · takeaglance.app",
    license: "MIT License",
  },
  guide: {
    title: "Guide",
    wordmark: "Glance",
    nav: [
      { href: "#start", label: "Get started" },
      { href: "#today", label: "Using Glance" },
      { href: "#sizes", label: "Screen sizes" },
      { href: "#faq", label: "FAQ" },
    ],
    back: "Back to Glance",
    hero: {
      eyebrow: "Guide for families",
      title: "Your family’s day, at a glance.",
      body: "Glance turns a screen at home into one shared board for your family’s calendar, weather, notes and photos. This guide covers setup and the everyday basics.",
      chips: { calendar: "Calendar", weather: "Weather", notes: "Notes", photos: "Photos" },
      preview: {
        date: "Fri, Oct 9",
        time: "10:41",
        temp: "64°",
        sky: "Rain from 4 PM",
        nowEyebrow: "Happening now",
        nowTitle: "Piano lesson",
        left: "34 min left",
        schedule: "Today · 4 of 5 left",
        events: [
          "8:00 School drop-off",
          "10:30 Piano lesson",
          "12:30 Lunch with Grandma",
          "4:30 Soccer practice",
          "6:30 Family dinner",
        ],
        notes: "Notes · 3",
        note: "Soccer cleats are by the door",
        photo: "Today’s photo",
      },
    },
    sections: [
      {
        id: "start",
        eyebrow: "01 · Sign in and account",
        title: "Get started with one email",
        intro:
          "One family, one account, one email address. Every screen signed in with it shows the same calendar, notes and photos. There are no passwords.",
        steps: [
          [
            "Open Glance on the screen, enter your family’s email and tap ",
            { strong: "Send code" },
            ".",
          ],
          ["Type the 6-digit code from the email. It works once, for 10 minutes."],
          [
            "New to Glance? Add your first name, then the city or ZIP where the screen is. That sets the weather and the clock’s time zone.",
          ],
        ],
      },
      {
        id: "today",
        eyebrow: "02 · Today",
        title: "The whole day on one screen",
        steps: [
          [
            { strong: "Now panel." },
            " The clock, today’s weather and what’s happening now or up next. Tap the weather or the event for more.",
          ],
          [
            { strong: "Schedule." },
            " Today’s plans in time order. Tap a plan for details, or a dashed free slot to add an event then. Tap the faces at the top to show one person’s plans. Plans that have ended fold away; tap ",
            { strong: "Earlier" },
            " to see them.",
          ],
          [
            { strong: "Notes and today’s photo." },
            " The newest family notes and one photo. Tap either to open it.",
          ],
        ],
        tip: [
          "The menu hides after 15 seconds without a touch. Tap the white tab on the left edge to bring it back. After a few idle minutes, the screen returns to Today on its own.",
        ],
      },
      {
        id: "calendar",
        eyebrow: "03 · Calendar",
        title: "Add an event",
        steps: [
          [
            "Open ",
            { strong: "Calendar" },
            " from the menu and pick a day in the week strip. The arrows move a week at a time.",
          ],
          [
            "Tap ",
            { strong: "Add event" },
            ", or tap a dashed free slot on the timeline to start at that time.",
          ],
          [
            "The event reads as one sentence. Tap a word to change it: what, which day, start and end, who and where. ",
            { strong: "Next" },
            " moves to the next part.",
          ],
          ["Tap ", { strong: "Save event" }, ". Each person’s plans show in their own color."],
        ],
        tip: [
          "Tap any event to see its details, the forecast for that day and what else is on at that time. Tap ",
          { strong: "Edit" },
          " to change or delete it. Events that have ended can’t be changed.",
        ],
      },
      {
        id: "weather",
        eyebrow: "04 · Weather and location",
        title: "Set where the screen is",
        intro:
          "Weather shows conditions now, the next 8 hours and a 7-day forecast. One place per family sets both the weather and the clock’s time zone.",
        steps: [
          ["Go to ", { strong: "Settings › Location" }, "."],
          [
            "Type a city or ZIP code, or tap ",
            { strong: "Use my location" },
            " and choose Allow. US places only for now.",
          ],
          ["If several places match, tap the right one. It saves straight away."],
        ],
      },
      {
        id: "notes",
        eyebrow: "05 · Notes",
        title: "Leave a note for the family",
        steps: [
          ["Tap ", { strong: "Add note" }, " on Today or on the Notes board."],
          ["Write your message, up to 280 characters. Add your name under From if you like."],
          ["Tap ", { strong: "Post note" }, ". It shows on every screen, newest first."],
        ],
        after: "Tap a note to read it in full. From there, Edit changes it and Delete removes it.",
        tip: [
          "Notes clear themselves after 7 days. Change this, or turn it off, in Settings › Remove notes after.",
        ],
      },
      {
        id: "photos",
        eyebrow: "06 · Photos",
        title: "Share photos on the screen",
        steps: [
          [
            "Add photos from a phone or tablet signed in to Glance: open ",
            { strong: "Photos" },
            " and tap Upload.",
          ],
          [
            "Photos play as a slideshow. Use Play/Pause and the arrows, or tap a thumbnail to show it.",
          ],
          [
            "Tap ",
            { strong: "Set as background" },
            " to put a photo behind every screen, or ",
            { strong: "Edit details" },
            " to fix its name, date or place.",
          ],
        ],
        after:
          "Each family has 5 GB of photo space, shared by every screen. Settings › Account shows what’s left.",
      },
      {
        id: "settings",
        eyebrow: "07 · Settings and seasons",
        title: "Make it yours",
        intro: "Changes apply as soon as you tap. There is no Save button.",
        steps: [
          [
            { strong: "Season" },
            " sets the screen’s colors. Auto follows the month: spring from March, summer from June, fall from September, winter from December.",
          ],
          [
            { strong: "Background" },
            " shows a drawing for the current season unless you pick your own photo or a slideshow. Choose Blank for a plain background.",
          ],
          [{ strong: "Clock and temperature:" }, " 12- or 24-hour, Fahrenheit or Celsius."],
        ],
      },
      {
        id: "events-data",
        eyebrow: "08 · Import, export and API",
        title: "Bring events in and out",
        intro: "Import, Export and API key need a connection.",
        steps: [
          [
            { strong: "Import events" },
            " adds events from an .ics calendar file, up to 5 MB and 1,000 events. Send the file from your phone by scanning the code, or choose a file on this screen. Pick who the events are for, then tap Import. Events already on the calendar and past events are skipped. Imported events are a one-time copy: later changes to the file don’t show up. Undo removes the whole import for 24 hours.",
          ],
          [
            { strong: "Export events" },
            " saves every upcoming event as an .ics file that other calendar apps can open. Past events are left out.",
          ],
          [
            { strong: "API key" },
            " lets another app read, add and update events on your calendar. Tap Create key and copy it right away; it’s shown only once. One key per account. Revoke it to stop the app, then create a new one if needed.",
          ],
        ],
      },
      {
        id: "ambient",
        eyebrow: "09 · Ambient",
        title: "A calm screen for quiet hours",
        intro:
          "Ambient dims the screen to a large clock, the weather and the next event. Good for evenings and overnight.",
        steps: [
          [
            "In ",
            { strong: "Settings › Ambient screen" },
            ", set the hours, for example 6:00 PM – 7:30 AM, and the brightness.",
          ],
          ["To start it any time, tap the moon in the menu."],
          ["Tap anywhere on the screen to wake it."],
        ],
      },
      {
        id: "notifications",
        eyebrow: "10 · Reminders",
        title: "Never miss the next thing",
        steps: [
          [
            "Choose when reminders come in ",
            { strong: "Settings › Notifications" },
            ": 15 or 30 minutes before, or off.",
          ],
          [
            "A black strip appears at the top of every screen for 30 seconds. Tap it to see the event.",
          ],
          ["Phones and tablets with Glance closed get a push notification instead."],
          ["Turn the chime on or off in Settings. It never plays during quiet hours."],
        ],
      },
      {
        id: "phone",
        eyebrow: "11 · Phone and tablet",
        title: "Take Glance with you",
        intro:
          "Glance runs on phones and tablets too, with the same calendar, notes and photos. Add it to your home screen, then sign in one of two ways.",
        steps: [
          [
            "On the big screen, open ",
            { strong: "Settings › Account › Sign in another device" },
            ". A code appears.",
          ],
          [
            "On the phone, tap ",
            { strong: "Scan code from another screen" },
            " and point the camera at it. The code lasts 5 minutes.",
          ],
          ["Or sign in with your family’s email and a code, as on the big screen."],
        ],
      },
    ],
    art: {
      code: {
        eyebrow: "Sign in",
        title: "Enter the code",
        body: "We sent a 6-digit code to maria@example.com. It works once, for 10 minutes.",
        digits: ["4", "8", "2", "9", "", ""],
        submit: "Sign in",
      },
      week: {
        range: "Oct 4 – 10",
        month: "October",
        days: [
          { weekday: "Sun", day: "4", events: false },
          { weekday: "Mon", day: "5", events: true },
          { weekday: "Tue", day: "6", events: true },
          { weekday: "Wed", day: "7", events: false },
          { weekday: "Thu", day: "8", events: true },
          { weekday: "Fri", day: "9", events: true },
          { weekday: "Sat", day: "10", events: true },
        ],
        today: "9",
      },
      sentence: {
        title: "New event",
        save: "Save event",
        what: "Soccer practice",
        day: "Fri, Oct 9",
        start: "4:30 PM",
        end: "6:00 PM",
        who: "Mia",
        where: "a place",
        joins: { on: " on ", from: " from ", to: " to ", for: " for ", at: " at ", end: "." },
      },
      who: {
        eyebrow: "Who",
        next: "Next: Where",
        everyone: "Everyone",
        people: ["Mia", "Leo", "Maria"],
      },
      weather: {
        eyebrow: "Portland, OR · Now",
        temp: "64°",
        summary: "Partly cloudy · High 68° · Low 51° · Rain moving in after 4 PM",
        days: [
          { day: "Fri", high: "68°", low: "51°" },
          { day: "Sat", high: "61°", low: "49°" },
          { day: "Sun", high: "59°", low: "47°" },
          { day: "Mon", high: "62°", low: "48°" },
          { day: "Tue", high: "66°", low: "50°" },
          { day: "Wed", high: "69°", low: "52°" },
          { day: "Thu", high: "65°", low: "50°" },
        ],
      },
      notes: [
        { text: "Soccer cleats are by the door", author: "Mom", time: "8:12 AM" },
        { text: "We’re out of milk", author: "Leo", time: "7:50 AM" },
        { text: "Library books due Saturday", author: "Dad", time: "Thu 6:40 PM" },
        { text: "Can we have tacos Friday?", author: "Mia", time: "Thu 4:05 PM" },
      ],
      photo: {
        title: "Pumpkin patch",
        date: "Oct 4",
        background: "Set as background",
      },
      season: {
        eyebrow: (sub: string) => `Season · ${sub}`,
        following: (season: string) => `Follows the month · now ${season}`,
        auto: "Auto",
      },
      eventsData: [
        {
          title: "Import events",
          body: "Add events from an .ics calendar file",
          end: "Last: Oct 20",
        },
        {
          title: "Export events",
          body: "Saves upcoming events as an .ics file",
          end: "Download .ics",
        },
        {
          title: "API key",
          body: "Lets other apps read, add and update events",
          end: "Create key",
        },
      ],
      ambient: {
        place: "Portland, OR",
        time: "9:48",
        temp: "52°",
        next: "Next · Tomorrow · 8:00 AM",
        title: "School drop-off",
        wake: "Tap anywhere to wake",
      },
      reminder: {
        eyebrow: "In 15 min · 4:30 PM · Mia",
        title: "Soccer practice",
        action: "Details",
      },
      phone: {
        scan: "Scan to sign in",
        expires: "Code expires in 4:52",
        point: "Point at the code on your Glance screen",
        cancel: "Cancel",
      },
    },
    sizes: {
      eyebrow: "Screen sizes",
      title: "One app, any screen",
      body: "Glance rearranges itself to fit the width of the screen. Nothing to set up.",
      items: [
        {
          id: "large",
          title: "Large",
          range: "Wider than 1200 px",
          body: "Wall and kiosk displays, TVs and laptops. Today fits in three columns with no scrolling.",
        },
        {
          id: "normal",
          title: "Normal",
          range: "769 – 1200 px",
          body: "Tablets and small laptops. Two columns: the Now panel and schedule first, then notes and the photo.",
        },
        {
          id: "small",
          title: "Small",
          range: "768 px and below",
          body: "Phones. One scrolling column, and the menu opens from the edge.",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Questions",
      items: [
        {
          q: "Does everyone need their own account?",
          a: "No. Glance uses one account per family, tied to one email address. Everyone shares the same calendar, notes and photos, and anyone can sign a new screen in with that email.",
        },
        {
          q: "Where did the menu go?",
          a: "It hides after 15 seconds without a touch so the screen stays clear. Tap the white tab on the left edge to bring it back. To keep it on screen, turn off Settings › Hide sidebar when idle.",
        },
        {
          q: "How do I change or delete an event?",
          a: "Tap the event to open its details, then tap Edit, or tap the word you want to change. Delete is on the Edit page: tap it once, then tap Delete event to confirm. Events that have ended can’t be changed.",
        },
        {
          q: "Can I add a school or team calendar?",
          a: "Yes, once. Go to Settings › Import events and choose its .ics file, or send it from your phone. The events become normal Glance events; later changes to the file don’t sync. Undo removes them for 24 hours.",
        },
        {
          q: "What happens if the internet drops?",
          a: "The screen keeps showing what it already has. Events and notes you add are saved on the screen as “Waiting to post” and sent once it reconnects.",
        },
        {
          q: "How do I sign a screen out?",
          a: "Go to Settings › Account › Sign out. You can sign out this screen only, or every phone, tablet and screen on the account. Calendars, notes and photos stay saved.",
        },
        {
          q: "Why is the clock in the wrong time zone?",
          a: "The clock follows the place set in Settings › Location, not the device’s own clock. Change the location and every time on the screen updates.",
        },
        {
          q: "How much photo space do we have?",
          a: "5 GB per family, shared by every screen. Settings › Account shows how much is left. Delete photos in Photos to make room.",
        },
        {
          q: "Why does the screen go back to Today?",
          a: "After a few minutes without a touch, Glance returns to Today so the day is always showing. Set the time, from 1 to 15 minutes, or turn it off in Settings › Back to Today after.",
        },
      ],
    },
    footer: { wordmark: "Glance", terms: "Terms of Service" },
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

function usedText(stamp: ActiveStamp | null): string {
  if (stamp === null) return "Never used";

  switch (stamp.kind) {
    case "minutes":
      return `Used ${stamp.count} min ago`;
    case "hours":
      return `Used ${stamp.count} hr ago`;
    case "yesterday":
      return "Used yesterday";
    case "on":
      return `Used ${stamp.date}`;
  }
}

function peopleText(names: readonly string[], others: number): string {
  const all = others > 0 ? [...names, `${others} others`] : names;

  if (all.length < 2) return all.join("");

  return `${all.slice(0, -1).join(", ")} and ${all.at(-1)}`;
}

function statusText(status: StatusTitle, length: (minutes: number) => string): string {
  switch (status.kind) {
    case "now":
      return "Happening now";
    case "in":
      return `In ${length(status.minutes)}`;
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "inDays":
      return `In ${status.days} days`;
    case "ended":
      return "Ended";
  }
}
