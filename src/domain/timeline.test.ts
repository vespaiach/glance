import {
  grownHeight,
  gutterWeather,
  hourWeather,
  outsideDay,
  planCard,
  planRain,
  type TimelineLayout,
  type TimelineOptions,
  timelineLayout,
} from "./timeline";
import { zonedInstant } from "./zone";

const tz = "America/Los_Angeles";

const OCT_9 = "2026-10-09";

const OCT_10 = "2026-10-10";

const october = (day: number, minutes: number) =>
  zonedInstant(tz, { year: 2026, month: 10, day }, minutes);

const NOW = october(9, 10 * 60 + 41);

const plan = (id: string, day: number, start: number, end?: number) => ({
  id,
  startAt: october(day, start).toISOString(),
  ...(end === undefined ? {} : { endAt: october(day, end).toISOString() }),
});

const OCT_9_PLANS = [
  plan("drop-off", 9, 465, 495),
  plan("video-call", 9, 630, 675),
  plan("lunch", 9, 720, 780),
  plan("dentist", 9, 840, 870),
  plan("soccer-practice", 9, 930, 990),
  plan("school", 9, 495, 900),
  plan("pickup", 9, 900, 915),
  plan("car-service", 9, 810, 870),
  plan("piano", 9, 1020, 1065),
  plan("movie-night", 9, 1140, 1230),
  plan("morning-run", 9, 420, 465),
  plan("physical-therapy", 9, 570, 630),
  plan("yoga", 9, 600, 660),
  plan("volunteer", 9, 660, 780),
  plan("haircut", 9, 780, 825),
  plan("chess", 9, 960, 1020),
  plan("soccer-pickup", 9, 990, 1005),
  plan("groceries", 9, 1080, 1125),
];

const OCT_10_PLANS = [
  plan("fishing", 10, 420, 660),
  plan("soccer-game", 10, 540, 630),
  plan("market", 10, 660, 720),
  plan("bait", 10, 270, 315),
  plan("late-movie", 10, 1320, 1410),
  plan("party", 10, 840, 960),
];

const CALENDAR: TimelineOptions = {
  span: "day",
  height: 640,
  width: 1000,
  passedFactor: 0.35,
  minPlanHeight: 44,
  minHourHeight: 0,
  minColumn: 0,
  longStrips: false,
};

const TALL: TimelineOptions = { ...CALENDAR, height: 3000 };

const FOLDING: TimelineOptions = { ...CALENDAR, width: 600, minColumn: 200 };

const FOLDED_COLUMN = 548 / 600 / 2;

const onOct9 = { day: OCT_9, now: NOW, tz };

const onOct10 = { day: OCT_10, now: NOW, tz };

type Plan = ReturnType<typeof plan>;

type Layout = TimelineLayout<Plan>;

const weightOf = (layout: Layout, hour: number) =>
  layout.rows.find((row) => row.hour === hour)?.weight;

const placed = (layout: Layout, id: string) => {
  const found = layout.plans.find((item) => item.plan.id === id);

  if (!found) throw new Error(`${id} is not on the timeline`);

  return found;
};

const slots = (layout: Layout) => layout.freeSlots.map((slot) => [slot.start, slot.end]);

describe("timelineLayout", () => {
  it("TL-01 runs 5 AM to 9 PM in 16 rows that fill the height", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);

    expect(layout.rows.map((row) => row.hour)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(layout.rows[0]?.top).toBe(0);
    expect(layout.rows.reduce((sum, row) => sum + row.height, 0)).toBeCloseTo(640);
    expect(layout.marks.map((mark) => mark.hour)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
    expect(layout.marks.at(-1)?.top).toBeCloseTo(640);
  });

  it("TL-02 an empty hour weighs 1 and an hour filled by short plans weighs 4", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);

    expect(weightOf(layout, 18)).toBe(1);
    expect(weightOf(layout, 9)).toBe(4);
  });

  it("TL-02 a partly covered hour weighs 1 + 3 × its covered share", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);

    expect(weightOf(layout, 10)).toBe(2.5);
  });

  it("TL-02 plans longer than 3 hours don't stretch hours", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);

    expect(weightOf(layout, 7)).toBe(1);
    expect(weightOf(layout, 8)).toBe(1);
  });

  it("TL-02 overlapping short plans count their covered time once", () => {
    const layout = timelineLayout(OCT_9_PLANS, { ...onOct9, now: october(8, 600) }, CALENDAR);

    expect(weightOf(layout, 10)).toBe(4);
  });

  it("TL-02 hours that fully passed today shrink by the passed factor", () => {
    const calendar = timelineLayout(OCT_9_PLANS, onOct9, CALENDAR);
    const today = timelineLayout(OCT_9_PLANS, onOct9, { ...CALENDAR, passedFactor: 0.3 });

    expect(weightOf(calendar, 7)).toBeCloseTo(1.4);
    expect(weightOf(calendar, 5)).toBeCloseTo(0.35);
    expect(weightOf(today, 7)).toBeCloseTo(1.2);
    expect(weightOf(calendar, 10)).toBe(4);
  });

  it("TL-02 other days never shrink", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);

    expect(weightOf(layout, 5)).toBe(1.75);
  });

  it("TL-02 heights are the weights scaled to the height", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);
    const total = layout.rows.reduce((sum, row) => sum + row.weight, 0);

    for (const row of layout.rows) expect(row.height).toBeCloseTo((row.weight / total) * 640);
    expect(layout.rows[1]?.top).toBeCloseTo(layout.rows[0]?.height ?? 0);
  });

  it("TL-06 24 hours runs 12 AM to 12 AM", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, { ...CALENDAR, span: "24h" });

    expect(layout.rows).toHaveLength(24);
    expect(layout.marks.map((mark) => mark.hour)).toEqual([...Array(25).keys()]);
  });

  it("TL-06 night hours without plans weigh half", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, { ...CALENDAR, span: "24h" });

    expect(weightOf(layout, 2)).toBe(0.5);
    expect(weightOf(layout, 21)).toBe(0.5);
  });

  it("TL-06 night hours with plans are elastic", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, { ...CALENDAR, span: "24h" });

    expect(weightOf(layout, 4)).toBe(2.5);
    expect(weightOf(layout, 22)).toBe(4);
    expect(weightOf(layout, 23)).toBe(2.5);
  });

  it("TL-06 night hours covered only by a long plan weigh 1", () => {
    const layout = timelineLayout([plan("drive", 10, 60, 300)], onOct10, {
      ...CALENDAR,
      span: "24h",
    });

    expect(weightOf(layout, 2)).toBe(1);
    expect(weightOf(layout, 0)).toBe(0.5);
  });

  it("TL-01 a label hides when it sits closer than 24 px to the label above", () => {
    const layout = timelineLayout([], onOct10, { ...CALENDAR, height: 320 });

    expect(layout.marks.slice(0, 5).map((mark) => mark.label)).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it("TL-01 a label hides when it sits closer than 22 px to the now marker", () => {
    const layout = timelineLayout([], onOct9, { ...CALENDAR, passedFactor: 1 });
    const label = (hour: number) => layout.marks.find((mark) => mark.hour === hour)?.label;

    expect(label(10)).toBe(true);
    expect(label(11)).toBe(false);
    expect(label(12)).toBe(true);
  });

  it("TL-06 hairlines thin out when rows get tight", () => {
    const layout = timelineLayout([], onOct10, { ...CALENDAR, height: 160 });

    expect(layout.marks.slice(0, 4).map((mark) => [mark.label, mark.line])).toEqual([
      [true, true],
      [false, false],
      [false, true],
      [true, true],
    ]);
  });

  it("TL-09 marks now on today at its place on the timeline", () => {
    const layout = timelineLayout([], onOct9, { ...CALENDAR, passedFactor: 1 });

    expect(layout.now?.minutes).toBe(641);
    expect(layout.now?.top).toBeCloseTo((341 / 60) * 40);
  });

  it("TL-09 other days and times outside the span have no now marker", () => {
    const early = { ...onOct9, now: october(9, 4 * 60) };

    expect(timelineLayout([], onOct10, CALENDAR).now).toBeNull();
    expect(timelineLayout([], early, CALENDAR).now).toBeNull();
    expect(timelineLayout([], early, { ...CALENDAR, span: "24h" }).now?.minutes).toBe(240);
  });

  it("TL-03 places a plan at its elastic start and end", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);
    const market = placed(layout, "market");
    const row11 = layout.rows.find((row) => row.hour === 11);

    expect(market.top).toBeCloseTo(row11?.top ?? -1);
    expect(market.height).toBeCloseTo(row11?.height ?? -1);
  });

  it("TL-03 every plan is at least the minimum height", () => {
    const calendar = timelineLayout(OCT_9_PLANS, onOct9, CALENDAR);
    const small = timelineLayout(OCT_9_PLANS, onOct9, { ...CALENDAR, minPlanHeight: 40 });

    expect(placed(calendar, "pickup").height).toBe(44);
    expect(placed(small, "pickup").height).toBe(40);
  });

  it("TL-03 overlapping plans share the width in columns", () => {
    const plans = [plan("a", 10, 540, 600), plan("b", 10, 540, 570), plan("c", 10, 570, 600)];
    const layout = timelineLayout(plans, onOct10, CALENDAR);

    expect(plans.map(({ id }) => placed(layout, id).left)).toEqual([0, 0.5, 0.5]);
    expect(plans.map(({ id }) => placed(layout, id).width)).toEqual([0.5, 0.5, 0.5]);
  });

  it("TL-03 a plan widens into free columns beside it", () => {
    const plans = [
      plan("a", 10, 540, 600),
      plan("b", 10, 540, 570),
      plan("c", 10, 540, 570),
      plan("d", 10, 570, 600),
    ];
    const layout = timelineLayout(plans, onOct10, CALENDAR);

    expect(placed(layout, "d")).toMatchObject({ left: 1 / 3, width: 2 / 3 });
    expect(placed(layout, "b")).toMatchObject({ left: 1 / 3, width: 1 / 3 });
  });

  it("TL-03 longer plans take the leftmost column", () => {
    const layout = timelineLayout(OCT_9_PLANS, onOct9, CALENDAR);

    expect(placed(layout, "school").left).toBe(0);
    expect(placed(layout, "yoga").left).toBeGreaterThan(0);
    expect(placed(layout, "video-call").left).toBeGreaterThan(0);
  });

  it("TL-03 plans that don't overlap use the full width", () => {
    const layout = timelineLayout(OCT_9_PLANS, onOct9, CALENDAR);

    expect(placed(layout, "movie-night")).toMatchObject({ left: 0, width: 1 });
  });

  it("TL-01 leaves out plans outside the span and clips one that starts before it", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, CALENDAR);

    expect(layout.plans.map((item) => item.plan.id)).not.toContain("late-movie");
    expect(placed(layout, "bait")).toMatchObject({ top: 0, startsBefore: true, start: 270 });
    expect(placed(layout, "market").startsBefore).toBe(false);
  });

  it("STATUS-01 a plan with no end takes 30 minutes on the timeline", () => {
    const layout = timelineLayout([plan("open", 10, 600)], onOct10, CALENDAR);

    expect(placed(layout, "open")).toMatchObject({ start: 600, end: 630 });
  });

  it("TL-08 free slots are the gaps of 30 min or more between 5 AM and 9 PM", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, TALL);

    expect(slots(layout)).toEqual([
      [315, 420],
      [720, 840],
      [960, 1260],
    ]);
  });

  it("TL-08 free slots stay within 5 AM to 9 PM on 24 hours", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, { ...TALL, span: "24h" });

    expect(slots(layout)).toEqual([
      [315, 420],
      [720, 840],
      [960, 1260],
    ]);
  });

  it("TL-08 on today free slots start at now", () => {
    const today = timelineLayout(OCT_9_PLANS, onOct9, TALL);
    const dayBefore = timelineLayout(OCT_9_PLANS, { ...onOct9, now: october(8, 600) }, TALL);

    expect(slots(today)).toEqual([[1230, 1260]]);
    expect(slots(dayBefore)).toEqual([
      [300, 420],
      [1230, 1260],
    ]);
  });

  it("TL-08 a slot cut short by now under 30 min is dropped", () => {
    const now = { ...onOct10, now: october(10, 1240) };

    expect(slots(timelineLayout(OCT_10_PLANS, now, CALENDAR))).toEqual([]);
  });

  it("TL-08 an empty day is one free slot", () => {
    expect(slots(timelineLayout([], onOct10, CALENDAR))).toEqual([[300, 1260]]);
  });

  it("TL-08 a free slot sits at its elastic place", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, TALL);
    const [, midday] = layout.freeSlots;
    const row12 = layout.rows.find((row) => row.hour === 12);
    const row14 = layout.rows.find((row) => row.hour === 14);

    expect(midday?.top).toBeCloseTo(row12?.top ?? -1);
    expect(midday?.height).toBeCloseTo((row14?.top ?? 0) - (row12?.top ?? 0));
  });

  it("TL-08 a new event starts at the slot rounded up to 15 min, 1 hour or to its end", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, TALL);
    const today = timelineLayout(OCT_9_PLANS, onOct9, TALL);
    const fromNow = timelineLayout([], onOct9, TALL);

    expect(layout.freeSlots[0]?.newEvent).toEqual({ start: 315, end: 375 });
    expect(today.freeSlots[0]?.newEvent).toEqual({ start: 1230, end: 1260 });
    expect(fromNow.freeSlots[0]?.newEvent).toEqual({ start: 645, end: 705 });
  });

  it("TL-08 a free slot shorter than 44 px isn't drawn", () => {
    const plans = [plan("a", 10, 540, 600), plan("b", 10, 630, 700)];

    expect(slots(timelineLayout(plans, onOct10, TALL))).toContainEqual([600, 630]);
    expect(slots(timelineLayout(plans, onOct10, CALENDAR))).not.toContainEqual([600, 630]);
  });

  it("TL-01 every hour row is at least the minimum hour height and the rows still fill", () => {
    const loose = timelineLayout(OCT_9_PLANS, onOct9, CALENDAR);
    const firm = timelineLayout(OCT_9_PLANS, onOct9, { ...CALENDAR, minHourHeight: 26 });

    expect(Math.min(...loose.rows.map((row) => row.height))).toBeLessThan(26);
    expect(Math.min(...firm.rows.map((row) => row.height))).toBeCloseTo(
      26 + (0.35 * (640 - 16 * 26)) / firm.rows.reduce((sum, row) => sum + row.weight, 0),
    );
    expect(firm.rows.reduce((sum, row) => sum + row.height, 0)).toBeCloseTo(640);
  });

  it("TL-12 columns narrower than the minimum fold into a +N MORE tile on the right", () => {
    const plans = [
      plan("a", 10, 540, 600),
      plan("b", 10, 540, 600),
      plan("c", 10, 550, 600),
      plan("d", 10, 545, 600),
    ];
    const layout = timelineLayout(plans, onOct10, FOLDING);

    expect(layout.plans.map((item) => item.plan.id)).toEqual(["a", "b"]);
    expect(placed(layout, "a")).toMatchObject({ left: 0, width: FOLDED_COLUMN });
    expect(placed(layout, "b")).toMatchObject({ left: FOLDED_COLUMN, width: FOLDED_COLUMN });
    expect(layout.more).toHaveLength(1);
    expect(layout.more[0]).toMatchObject({
      count: 2,
      left: 2 * FOLDED_COLUMN,
      start: 545,
      end: 600,
      top: placed(layout, "a").top + (placed(layout, "a").height * 5) / 60,
      tall: true,
    });
    expect(layout.more[0]?.first.id).toBe("d");
  });

  it("TL-12 a short +N tile is at least 48 px tall and shows the count alone", () => {
    const plans = ["a", "b", "c", "d"].map((id) => plan(id, 10, 1080, 1095));
    const [more] = timelineLayout(plans, onOct10, FOLDING).more;

    expect(more).toMatchObject({ count: 2, height: 48, tall: false });
  });

  it("TL-12 a plan with nothing folded beside it uses the full width", () => {
    const plans = [
      plan("a", 10, 540, 660),
      plan("b", 10, 540, 570),
      plan("c", 10, 540, 570),
      plan("d", 10, 540, 570),
      plan("e", 10, 600, 660),
    ];
    const layout = timelineLayout(plans, onOct10, FOLDING);

    expect(placed(layout, "e")).toMatchObject({ left: FOLDED_COLUMN, width: 1 - FOLDED_COLUMN });
    expect(placed(layout, "b").width).toBe(FOLDED_COLUMN);
  });

  it("TL-12 columns that fit their minimum width never fold", () => {
    const plans = ["a", "b", "c", "d"].map((id) => plan(id, 10, 540, 600));
    const layout = timelineLayout(plans, onOct10, { ...FOLDING, width: 1000 });

    expect(layout.more).toEqual([]);
    expect(layout.plans.map((item) => item.width)).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it("TL-13 plans over 3 hours leave the columns as 44 px edge strips side by side", () => {
    const plans = [...OCT_9_PLANS, plan("camp", 9, 480, 720)];
    const layout = timelineLayout(plans, onOct9, { ...CALENDAR, longStrips: true });
    const row8 = layout.rows.find((row) => row.hour === 8);

    expect(layout.strips.map((strip) => [strip.plan.id, strip.left])).toEqual([
      ["camp", 0],
      ["school", 52],
    ]);
    expect(layout.stripsWidth).toBe(104);
    expect(layout.strips[0]?.top).toBeCloseTo(row8?.top ?? -1);
    expect(layout.plans.map((item) => item.plan.id)).not.toContain("school");
    expect(layout.plans.map((item) => item.plan.id)).not.toContain("camp");
  });

  it("TL-13 the columns fold against the width the strips leave", () => {
    const plans = [
      plan("a", 10, 540, 600),
      plan("b", 10, 540, 600),
      plan("c", 10, 540, 600),
      plan("d", 10, 540, 600),
      plan("school", 10, 480, 900),
    ];
    const layout = timelineLayout(plans, onOct10, { ...FOLDING, width: 652, longStrips: true });

    expect(layout.more[0]?.left).toBeCloseTo(2 * FOLDED_COLUMN);
  });

  it("CAL-06 counts plans that start before 5 AM or end after 9 PM", () => {
    expect(timelineLayout(OCT_10_PLANS, onOct10, CALENDAR).hiddenOutsideSpan).toBe(2);
    expect(timelineLayout(OCT_9_PLANS, onOct9, CALENDAR).hiddenOutsideSpan).toBe(0);
  });

  it("CAL-06 nothing is outside the span on 24 hours", () => {
    const layout = timelineLayout(OCT_10_PLANS, onOct10, { ...CALENDAR, span: "24h" });

    expect(layout.hiddenOutsideSpan).toBe(0);
  });
});

describe("outsideDay", () => {
  it("CAL-06 counts the badge's plans before 5 AM or after 9 PM without a layout", () => {
    expect(outsideDay(OCT_10_PLANS, tz)).toBe(2);
    expect(outsideDay(OCT_9_PLANS, tz)).toBe(0);
  });
});

describe("planCard", () => {
  const card = { width: 400, titleSize: 22, badge: false, note: true };

  it("TL-04 a tall wide card shows the range, two title lines, who and where, then notes", () => {
    expect(planCard({ ...card, height: 200 })).toEqual({
      oneLine: false,
      time: "range",
      titleLines: 2,
      meta: true,
      note: true,
    });
  });

  it("TL-04 a card too short for the time over the title becomes one line", () => {
    expect(planCard({ ...card, height: 60 })).toMatchObject({ oneLine: true, time: "start" });
    expect(planCard({ ...card, height: 71 })).toMatchObject({ oneLine: false, titleLines: 1 });
  });

  it("TL-04 a one-line card under 200 px wide hides the start time", () => {
    expect(planCard({ ...card, height: 44, width: 199 })).toMatchObject({ time: "none" });
    expect(planCard({ ...card, height: 44, width: 200 })).toMatchObject({ time: "start" });
  });

  it("TL-04 a card under 260 px wide shows only the start time", () => {
    expect(planCard({ ...card, height: 200, width: 259 })).toMatchObject({ time: "start" });
    expect(planCard({ ...card, height: 200, width: 260 })).toMatchObject({ time: "range" });
  });

  it("TL-04 who and where need 26 px below the title and notes another 26", () => {
    expect(planCard({ ...card, height: 97 })).toMatchObject({ meta: true, note: false });
    expect(planCard({ ...card, height: 96 })).toMatchObject({ meta: false, note: false });
    expect(planCard({ ...card, height: 150 })).toMatchObject({ titleLines: 2, note: true });
    expect(planCard({ ...card, height: 149 })).toMatchObject({ meta: true, note: false });
  });

  it("TL-04 a second title line comes before who and where", () => {
    expect(planCard({ ...card, height: 102 })).toMatchObject({ titleLines: 2, meta: false });
  });

  it("TL-04 a plan without notes never shows the notes line", () => {
    expect(planCard({ ...card, height: 200, note: false })).toMatchObject({ note: false });
  });

  it("TL-07 a rain chip makes the first line taller", () => {
    expect(planCard({ ...card, height: 74 })).toMatchObject({ oneLine: false });
    expect(planCard({ ...card, height: 74, badge: true })).toMatchObject({ oneLine: true });
  });
});

describe("planRain", () => {
  const rain = new Map([
    [9, 70],
    [10, 80],
    [11, 40],
  ]);

  it("TL-07 a plan overlapping hours of 50% rain or more gets the highest chance", () => {
    expect(planRain(540, 630, rain, 400)).toBe(80);
    expect(planRain(420, 600, rain, 400)).toBe(70);
  });

  it("TL-07 a plan only in hours under 50% gets no chip", () => {
    expect(planRain(660, 720, rain, 400)).toBe(0);
    expect(planRain(540, 630, new Map(), 400)).toBe(0);
  });

  it("TL-07 a plan ending on the hour doesn't reach the next hour", () => {
    expect(planRain(480, 540, rain, 400)).toBe(0);
  });

  it("TL-07 a card under 180 px wide gets no chip", () => {
    expect(planRain(540, 630, rain, 179)).toBe(0);
    expect(planRain(540, 630, rain, 180)).toBe(80);
  });
});

describe("gutterWeather", () => {
  const mark = { label: true, top: 100 };

  it("TODAY-11 shows under a label when its hour is at least 46 px tall", () => {
    expect(gutterWeather(mark, 46, null)).toBe(true);
    expect(gutterWeather(mark, 45, null)).toBe(false);
  });

  it("TODAY-11 hides under a hidden label", () => {
    expect(gutterWeather({ ...mark, label: false }, 80, null)).toBe(false);
  });

  it("TODAY-11 hides when the now marker sits in its way", () => {
    expect(gutterWeather(mark, 80, 120)).toBe(false);
    expect(gutterWeather(mark, 80, 103)).toBe(true);
    expect(gutterWeather(mark, 80, 147)).toBe(true);
  });
});

describe("hourWeather", () => {
  const layout = timelineLayout([], onOct10, { ...CALENDAR, height: 1600 });

  const sky = new Map(
    Array.from({ length: 16 }, (_, i) => {
      const hour = 5 + i;
      return [
        hour,
        { icon: hour >= 17 ? "sun" : "cloud", precip: hour === 12 || hour === 13 ? 60 : 0 },
      ];
    }),
  );

  const shown = (sparse: boolean) => [...hourWeather(layout, sky, sparse)];

  it("TL-07 Calendar shows the weather under every hour that has room", () => {
    expect(shown(false)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("TL-07 Today shows the first hour, icon changes, rain starting or stopping, else every 3 hours", () => {
    expect(shown(true)).toEqual([5, 8, 11, 12, 14, 17, 20]);
  });

  it("TL-07 hours without a forecast or room show nothing", () => {
    const short = timelineLayout([], onOct10, CALENDAR);

    expect([...hourWeather(short, sky, false)]).toEqual([]);
    expect([...hourWeather(layout, new Map(), false)]).toEqual([]);
  });
});

describe("Today timeline", () => {
  const TODAY: TimelineOptions = {
    ...CALENDAR,
    height: 536,
    passedFactor: 0.3,
    minPlanHeight: 48,
    minColumn: 120,
    longStrips: true,
  };

  it("TODAY-11 a timeline from the current hour starts its rows and marks there", () => {
    const layout = timelineLayout([], onOct9, { ...TODAY, firstHour: 10 });

    expect(layout.rows.map((row) => row.hour)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(layout.marks[0]).toMatchObject({ hour: 10, top: 0 });
    expect(layout.now?.top).toBeGreaterThan(0);
  });

  it("TODAY-11 with the now dot, hour labels hide only within 10 px of it", () => {
    const options = { ...TODAY, height: 550, firstHour: 10 };

    const pill = timelineLayout([], onOct9, options);

    const dot = timelineLayout([], onOct9, { ...options, nowDot: true });

    expect(pill.marks.find((mark) => mark.hour === 11)?.label).toBe(false);
    expect(dot.marks.find((mark) => mark.hour === 11)?.label).toBe(true);
  });

  it("TODAY-11 the timeline keeps its height when every plan ahead has room", () => {
    expect(grownHeight([plan("call", 9, 720, 840)], onOct9, TODAY)).toBe(536);
  });

  it("TODAY-11 the timeline grows until a short plan ahead has room for a 66 px card", () => {
    const plans = [plan("quick", 9, 900, 920)];

    const height = grownHeight(plans, onOct9, TODAY);

    const layout = timelineLayout(plans, onOct9, { ...TODAY, height, minPlanHeight: 0 });

    expect(height).toBeGreaterThan(536);
    expect(placed(layout, "quick").height - 4).toBeGreaterThanOrEqual(65.5);
  });

  it("TODAY-11 a plan of 30 min or more needs room for a 92 px card", () => {
    const plans = [plan("half", 9, 900, 930)];

    const height = grownHeight(plans, onOct9, TODAY);

    const layout = timelineLayout(plans, onOct9, { ...TODAY, height, minPlanHeight: 0 });

    expect(placed(layout, "half").height - 4).toBeCloseTo(92, 0);
  });

  it("TODAY-11 the timeline grows at most 3×", () => {
    expect(grownHeight([plan("blink", 9, 900, 902)], onOct9, TODAY)).toBe(3 * 536);
  });

  it("TODAY-11 ended plans don't grow the timeline", () => {
    expect(grownHeight([plan("early", 9, 480, 485)], onOct9, TODAY)).toBe(536);
  });
});

describe("planCard time line", () => {
  it("TODAY-11 a 20 px time line needs 2 px more before the card shows the time over the title", () => {
    const card = { width: 400, height: 68, titleSize: 20, badge: false, note: false };

    expect(planCard(card)).toMatchObject({ oneLine: false });
    expect(planCard({ ...card, timeLine: 20 })).toMatchObject({ oneLine: true });
  });
});
