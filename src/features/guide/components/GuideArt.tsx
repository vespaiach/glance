import * as stylex from "@stylexjs/stylex";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  Download,
  Image,
  type LucideIcon,
  MapPin,
  Maximize,
  Moon,
  Pause,
  Plus,
  QrCode,
  Sun,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import type { Season } from "@/domain/schemas";
import { season as seasonVars } from "@/theme/seasons.stylex";
import { fall, summer, winter } from "@/theme/themes";
import { colors, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "@/ui/Icon";
import { StickyNote } from "@/ui/StickyNote";
import { seasonIcons } from "@/ui/seasonIcons";

export type GuideSectionId = (typeof copy.guide.sections)[number]["id"];

type SizeId = (typeof copy.guide.sizes.items)[number]["id"];

const art = copy.guide.art;

const preview = copy.guide.hero.preview;

const SEASONS = ["spring", "summer", "fall", "winter"] as const satisfies readonly Season[];

export const SEASON_THEMES = { spring: null, summer, fall, winter } satisfies Record<
  Season,
  unknown
>;

const FORECAST_ICONS: readonly LucideIcon[] = [
  CloudSun,
  CloudRain,
  CloudDrizzle,
  Cloud,
  Sun,
  Sun,
  CloudSun,
];

const NOTE_TILTS = [-2, 1.5, 1, -1.5];

const EVENTS_DATA_BUTTONS: readonly (LucideIcon | null)[] = [null, Download, Plus];

const ACTIVE_DIGIT = 4;

const s = stylex.create({
  mono: {
    fontFamily: type.fontMono,
    fontWeight: 400,
    lineHeight: 1,
    textTransform: "uppercase",
  },
  mono12: { fontSize: 12 },
  mono13: { fontSize: 13 },
  mono14: { fontSize: 14 },
  spaced: { letterSpacing: "0.54px" },
  round: { borderRadius: "50%" },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    fontWeight: 480,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  ink: { backgroundColor: colors.black, color: colors.white },
  white: { backgroundColor: colors.white },
  soft: { backgroundColor: colors.surfaceSoft },
  seasonSoft: { backgroundColor: seasonVars.soft },
  block1: { backgroundColor: seasonVars.block1 },
  block2: { backgroundColor: seasonVars.block2 },
  block3: { backgroundColor: seasonVars.block3 },
  block4: { backgroundColor: seasonVars.block4 },
  center: { display: "grid", placeItems: "center", flexShrink: 0 },
  column: { display: "flex", flexDirection: "column", minWidth: 0 },
  panel: { borderRadius: 24 },
  panelPad: { padding: "clamp(16px, 3vw, 32px)" },
  panelPadLg: { padding: "clamp(24px, 4vw, 48px)" },
  panelPadMd: { padding: "clamp(24px, 4vw, 40px)" },
  card16: { borderRadius: 16, padding: 16 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    fontFamily: type.fontMono,
    fontSize: 14,
    lineHeight: 1,
    backgroundColor: colors.black,
    color: colors.white,
  },

  bezel: {
    width: "100%",
    backgroundColor: colors.black,
    borderRadius: 20,
    padding: 10,
    boxSizing: "border-box",
  },
  screen: {
    aspectRatio: "16 / 10",
    backgroundColor: seasonVars.soft,
    borderRadius: 12,
    padding: "10px 10px 10px 18px",
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "0.8fr 1.6fr 1fr",
    gap: 8,
    position: "relative",
    overflow: "hidden",
    containerType: "inline-size",
  },
  handle: {
    position: "absolute",
    left: 0,
    top: "50%",
    transform: "translateY(-50%)",
    width: 10,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: "0 8px 8px 0",
  },
  tile: {
    borderRadius: 10,
    padding: 8,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  nowTile: { gap: 5, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" },
  tiny17: { fontSize: "max(8px, 1.7cqi)" },
  tiny15: { fontSize: "max(8px, 1.5cqi)" },
  previewClock: {
    fontSize: "7.5cqi",
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: "-0.04em",
    fontVariantNumeric: "tabular-nums",
  },
  previewRule: { height: 1, backgroundColor: colors.white, marginBlock: 2 },
  previewTemp: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: "5cqi",
    fontWeight: 300,
    lineHeight: 1,
  },
  previewSky: { fontSize: "max(8px, 1.6cqi)", fontWeight: 330, lineHeight: 1.3 },
  previewTitle: { fontSize: "2.8cqi", fontWeight: 340, lineHeight: 1.1 },
  previewLeft: {
    alignSelf: "flex-start",
    borderRadius: 999,
    padding: "2px 6px",
    fontSize: "max(8px, 1.4cqi)",
    lineHeight: 1.2,
  },
  scheduleTile: { gap: 4 },
  scheduleEyebrow: { marginBottom: 2 },
  previewEvent: {
    borderRadius: 5,
    padding: "4px 6px",
    fontSize: "max(8px, 1.7cqi)",
    fontWeight: 540,
    lineHeight: 1.2,
  },
  previewPast: { fontWeight: 340, boxShadow: shadows.shadow1 },
  previewNow: { boxShadow: `inset 0 0 0 1.5px ${colors.black}`, flexGrow: 1.4 },
  grow1: { flexGrow: 1 },
  grow14: { flexGrow: 1.4 },
  sideColumn: { gap: 8 },
  notesTile: { flexGrow: 1, gap: 6 },
  previewNote: {
    flexGrow: 1,
    backgroundColor: seasonVars.soft,
    borderRadius: 3,
    padding: 6,
    transform: "rotate(-2deg)",
    boxShadow: "0 2px 8px rgba(0,0,0,.08)",
    fontSize: "max(8px, 1.8cqi)",
    lineHeight: 1.2,
  },
  photoTile: { gap: 5 },
  previewPhoto: { aspectRatio: "4 / 3", borderRadius: 5 },
  standNeck: { width: 18, height: 56, backgroundColor: colors.black },
  standFoot: { width: "46%", height: 12, backgroundColor: colors.black, borderRadius: 999 },
  previewWrap: { alignItems: "center" },

  codeFrame: { display: "grid", placeItems: "center" },
  codeCard: {
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    boxSizing: "border-box",
    gap: 16,
  },
  codeTitle: { fontSize: 32, fontWeight: 340, lineHeight: 1.1, letterSpacing: "-0.5px" },
  small: { fontSize: 16, fontWeight: 330, lineHeight: 1.45 },
  digits: { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 },
  digit: {
    height: 52,
    borderRadius: 8,
    boxShadow: shadows.shadow1,
    display: "grid",
    placeItems: "center",
    fontFamily: type.fontMono,
    fontSize: 24,
    lineHeight: 1,
  },
  digitActive: { boxShadow: `inset 0 0 0 2px ${colors.black}` },
  codeSubmit: {
    height: 52,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    color: colors.textPlaceholder,
    fontSize: 18,
    fontWeight: 480,
    lineHeight: 1,
  },

  todayFrame: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1.6fr 1fr",
    gap: 12,
    minHeight: 380,
  },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  bar: { borderRadius: 6, backgroundColor: colors.white },
  bar28: { height: 28, width: "80%" },
  bar18: { height: 18, width: "55%" },
  bar12a: { height: 12, width: "70%" },
  bar12b: { height: 12, width: "50%" },
  faces: { display: "flex", marginBlock: 4 },
  face: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    boxShadow: `0 0 0 2px ${colors.white}`,
  },
  faceOverlap: { marginLeft: -6 },
  slot: { borderRadius: 8 },
  slotPast: { flexGrow: 0.8, boxShadow: shadows.shadow1 },
  slotNow: { flexGrow: 1.2, boxShadow: `inset 0 0 0 2px ${colors.black}` },
  slotFree: {
    flexGrow: 0.6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.hairline,
  },
  slotNext: { flexGrow: 1 },
  noteSlab: {
    flexGrow: 1,
    backgroundColor: seasonVars.soft,
    borderRadius: 6,
    transform: "rotate(-2deg)",
    boxShadow: shadows.shadow2,
  },
  photoCard: { borderRadius: 16, padding: 12 },
  photoSlab: { display: "block", aspectRatio: "4 / 3", borderRadius: 8 },

  week: { borderRadius: 16, padding: "12px 16px", gap: 12 },
  weekHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  month: { fontSize: 20, fontWeight: 540, lineHeight: 1.2 },
  arrows: { display: "flex", gap: 4 },
  circle36: { width: 36, height: 36, borderRadius: "50%" },
  circle44: { width: 44, height: 44, borderRadius: "50%" },
  days: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2 },
  day: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    paddingBlock: 4,
  },
  dayNumber: { fontSize: 17, fontWeight: 480, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  dot6: { width: 6, height: 6, borderRadius: "50%" },
  accent: { backgroundColor: seasonVars.accent },
  sentenceCard: { borderRadius: 24, padding: "20px 24px 24px", gap: 20 },
  taskBar: { display: "flex", alignItems: "center", gap: 12 },
  taskTitle: { flexGrow: 1, fontSize: 22, fontWeight: 540, lineHeight: 1.1 },
  save: { padding: "12px 18px", fontSize: 16 },
  sentence: {
    margin: 0,
    fontSize: "clamp(22px, 2.6vw, 30px)",
    fontWeight: 340,
    lineHeight: 1.3,
    letterSpacing: "-0.3px",
    textWrap: "pretty",
  },
  word: { textDecorationLine: "underline", textUnderlineOffset: 5 },
  wordSet: { fontWeight: 540 },
  nowrap: { whiteSpace: "nowrap" },
  wordActive: {
    backgroundColor: colors.white,
    borderRadius: 6,
    paddingInline: "0.15em",
    fontWeight: 540,
    whiteSpace: "nowrap",
  },
  pickerCard: { borderRadius: 24, padding: "20px 24px 24px", gap: 16 },
  chip: { padding: "12px 16px", fontSize: 15 },
  chipPerson: { paddingLeft: 12 },
  chips: { display: "flex", gap: 8, flexWrap: "wrap" },
  dot16: { width: 16, height: 16, borderRadius: "50%" },

  weather: { gap: 20 },
  weatherRow: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  weatherTemp: {
    fontSize: "clamp(80px, 10vw, 128px)",
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: "-5px",
    fontVariantNumeric: "tabular-nums",
  },
  summary: { fontSize: 20, fontWeight: 330, lineHeight: 1.4 },
  forecast: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 },
  forecastDay: {
    borderRadius: 12,
    padding: "12px 4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  high: { fontSize: 16, fontWeight: 480, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  low: { fontSize: 14, fontWeight: 330, lineHeight: 1, fontVariantNumeric: "tabular-nums" },

  notes: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 28,
  },
  noteText: { fontSize: 22, fontWeight: 400, lineHeight: 1.25 },

  photos: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
    gap: 12,
  },
  span2: { gridColumn: "1 / -1" },
  bigPhoto: { aspectRatio: "16 / 10", borderRadius: 8, display: "grid", placeItems: "center" },
  photoMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  photoTitle: { fontSize: 18, fontWeight: 540, lineHeight: 1.2 },
  controls: { display: "flex", gap: 6 },
  background: { fontSize: 16, padding: 0 },
  thumbs: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  thumb: { aspectRatio: "4 / 3", borderRadius: 8 },
  thumbOn: { boxShadow: `0 0 0 2px ${colors.white}, 0 0 0 4px ${colors.black}` },

  settings: { gap: 16 },
  seasonCard: { borderRadius: 24, boxShadow: shadows.shadow1, padding: 24, gap: 4 },
  seasonEyebrow: { marginBottom: 8 },
  seasonRow: { display: "flex", alignItems: "center", gap: 14, minHeight: 52 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    boxShadow: `inset 0 0 0 2px ${colors.black}`,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  radioDot: { width: 12, height: 12, borderRadius: "50%", backgroundColor: colors.black },
  seasonLabel: { fontSize: 18, fontWeight: 330, lineHeight: 1 },
  seasonLabelOn: { fontWeight: 540 },
  swatches: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 },
  swatch: { gap: 6 },
  swatchGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 3,
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: "1",
  },

  dataCard: { borderRadius: 24, paddingInline: 24, paddingBlock: 4 },
  dataRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px 24px",
    paddingBlock: 20,
  },
  dataRule: { boxShadow: `inset 0 -1px 0 ${colors.borderHairlineSoft}` },
  dataWords: { gap: 4, minWidth: 160, flex: "1 1 200px" },
  dataTitle: { fontSize: 20, fontWeight: 540, lineHeight: 1.2, letterSpacing: "-0.2px" },
  dataBody: { fontSize: 15, fontWeight: 330, lineHeight: 1.4, textWrap: "pretty" },
  dataLink: { display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 330 },
  dataButton: {
    minHeight: 44,
    paddingInline: 20,
    fontSize: 16,
    boxShadow: `inset 0 0 0 1px ${colors.black}`,
  },

  ambient: {
    backgroundColor: seasonVars.deep,
    color: colors.ambientInkMedium,
    aspectRatio: "16 / 10",
    padding: "clamp(20px, 4vw, 40px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 12,
  },
  iconLine: { display: "flex", alignItems: "center", gap: 8 },
  ambientRow: { display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" },
  ambientClock: {
    fontSize: "clamp(64px, 10vw, 128px)",
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: "-0.04em",
    fontVariantNumeric: "tabular-nums",
  },
  ambientTemp: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    fontSize: "clamp(28px, 3.5vw, 44px)",
    fontWeight: 300,
    lineHeight: 1,
  },
  gap2: { gap: 2 },
  gap4: { gap: 4 },
  gap6: { gap: 6 },
  ambientTitle: { fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 340, lineHeight: 1.15 },

  reminders: { gap: 12, minHeight: 340 },
  strip: {
    borderRadius: 24,
    boxShadow: shadows.shadow3,
    padding: "16px 20px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    position: "relative",
    overflow: "hidden",
  },
  stripText: { flexGrow: 1, minWidth: 180, gap: 6 },
  stripEyebrow: { display: "flex", alignItems: "center", gap: 8, lineHeight: 1.2 },
  dot10: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  stripTitle: { fontSize: 24, fontWeight: 540, lineHeight: 1.15 },
  details: {
    backgroundColor: colors.white,
    color: colors.black,
    padding: "12px 18px",
    fontSize: 16,
  },
  progress: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: colors.onInverseSoft,
  },
  progressFill: { display: "block", width: "62%", height: "100%", backgroundColor: colors.white },
  behind: { flexGrow: 1, display: "grid", gridTemplateColumns: "0.8fr 1.6fr", gap: 12 },
  rounded16: { borderRadius: 16 },

  phone: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  scanCard: {
    borderRadius: 20,
    padding: 20,
    width: 200,
    boxSizing: "border-box",
    alignItems: "center",
    gap: 12,
    textAlign: "center",
  },
  qr: { width: 120, height: 120, borderRadius: 8, boxShadow: shadows.shadow1 },
  handset: {
    width: 200,
    aspectRatio: "9 / 19",
    backgroundColor: colors.black,
    borderRadius: 32,
    padding: 8,
    boxSizing: "border-box",
  },
  handsetScreen: {
    height: "100%",
    borderRadius: 24,
    backgroundColor: "#1a1a1a",
    color: colors.white,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 16,
    boxSizing: "border-box",
    textAlign: "center",
  },
  viewfinder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    boxShadow: `inset 0 0 0 3px ${colors.white}`,
  },
  point: { fontSize: 15, fontWeight: 540, lineHeight: 1.25 },
  cancel: {
    backgroundColor: colors.white,
    color: colors.black,
    padding: "10px 18px",
    fontSize: 14,
  },

  sizeFrame: {
    borderWidth: 3,
    borderStyle: "solid",
    borderColor: colors.black,
    boxSizing: "border-box",
  },
  sizeLarge: {
    width: "100%",
    maxWidth: 260,
    aspectRatio: "16 / 9",
    borderRadius: 12,
    padding: 8,
    display: "grid",
    gridTemplateColumns: "0.8fr 1.8fr 0.95fr",
    gap: 6,
  },
  sizeNormal: {
    width: 170,
    aspectRatio: "4 / 3",
    borderRadius: 14,
    padding: 8,
    display: "grid",
    gridTemplateColumns: "0.8fr 1.2fr",
    gridTemplateRows: "1.4fr 1fr",
    gap: 6,
  },
  sizeSmall: {
    width: 84,
    height: 172,
    borderRadius: 18,
    padding: 7,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  pane: { borderRadius: 4 },
  grow07: { flexGrow: 0.7 },
  grow08: { flexGrow: 0.8 },
});

const ART: Record<Exclude<GuideSectionId, "settings">, () => ReactNode> = {
  start: CodeArt,
  today: TodayArt,
  calendar: CalendarArt,
  weather: WeatherArt,
  notes: NotesArt,
  photos: PhotosArt,
  "events-data": EventsDataArt,
  ambient: AmbientArt,
  notifications: ReminderArt,
  phone: PhoneArt,
};

export function GuideArt({ id, season }: { id: GuideSectionId; season: Season }) {
  if (id === "settings") return <SettingsArt season={season} />;

  const Art = ART[id];

  return <Art />;
}

export function HeroPreview() {
  return (
    <div aria-hidden {...stylex.props(s.column, s.previewWrap)}>
      <div {...stylex.props(s.bezel)}>
        <div {...stylex.props(s.screen)}>
          <span {...stylex.props(s.handle)} />
          <div {...stylex.props(s.tile, s.nowTile, s.block1)}>
            <span {...stylex.props(s.mono, s.tiny17)}>{preview.date}</span>
            <span {...stylex.props(s.previewClock)}>{preview.time}</span>
            <span {...stylex.props(s.previewRule)} />
            <span {...stylex.props(s.previewTemp)}>
              {preview.temp}
              <Icon icon={CloudSun} size={18} strokeWidth={1.5} />
            </span>
            <span {...stylex.props(s.previewSky)}>{preview.sky}</span>
            <span {...stylex.props(s.previewRule)} />
            <span {...stylex.props(s.mono, s.tiny15)}>{preview.nowEyebrow}</span>
            <span {...stylex.props(s.previewTitle)}>{preview.nowTitle}</span>
            <span {...stylex.props(s.mono, s.previewLeft, s.ink)}>{preview.left}</span>
          </div>
          <div {...stylex.props(s.tile, s.scheduleTile, s.white)}>
            <span {...stylex.props(s.mono, s.tiny15, s.scheduleEyebrow)}>{preview.schedule}</span>
            {preview.events.map((event, index) => (
              <span key={event} {...stylex.props(s.previewEvent, ...previewEventStyle(index))}>
                {event}
              </span>
            ))}
          </div>
          <div {...stylex.props(s.column, s.sideColumn)}>
            <div {...stylex.props(s.tile, s.notesTile, s.white)}>
              <span {...stylex.props(s.mono, s.tiny15)}>{preview.notes}</span>
              <span {...stylex.props(s.previewNote)}>{preview.note}</span>
            </div>
            <div {...stylex.props(s.tile, s.photoTile, s.white)}>
              <span {...stylex.props(s.mono, s.tiny15)}>{preview.photo}</span>
              <span {...stylex.props(s.previewPhoto, s.block4, s.center)}>
                <Icon icon={Image} size={20} />
              </span>
            </div>
          </div>
        </div>
      </div>
      <span {...stylex.props(s.standNeck)} />
      <span {...stylex.props(s.standFoot)} />
    </div>
  );
}

export function SizeArt({ id }: { id: SizeId }) {
  if (id === "large") {
    return (
      <span {...stylex.props(s.sizeFrame, s.sizeLarge)}>
        <span {...stylex.props(s.pane, s.block1)} />
        <span {...stylex.props(s.pane, s.white)} />
        <span {...stylex.props(s.pane, s.white)} />
      </span>
    );
  }

  if (id === "normal") {
    return (
      <span {...stylex.props(s.sizeFrame, s.sizeNormal)}>
        <span {...stylex.props(s.pane, s.block1)} />
        <span {...stylex.props(s.pane, s.white)} />
        <span {...stylex.props(s.pane, s.white)} />
        <span {...stylex.props(s.pane, s.white)} />
      </span>
    );
  }

  return (
    <span {...stylex.props(s.sizeFrame, s.sizeSmall)}>
      <span {...stylex.props(s.pane, s.block1, s.grow07)} />
      <span {...stylex.props(s.pane, s.white, s.grow14)} />
      <span {...stylex.props(s.pane, s.white, s.grow08)} />
    </span>
  );
}

function previewEventStyle(index: number) {
  return (
    [
      [s.previewPast],
      [s.previewNow, s.block2],
      [s.block4, s.grow1],
      [s.block3, s.grow14],
      [s.seasonSoft, s.grow1],
    ][index] ?? []
  );
}

function CodeArt() {
  return (
    <div aria-hidden {...stylex.props(s.panel, s.panelPadLg, s.block1, s.codeFrame)}>
      <div {...stylex.props(s.column, s.codeCard, s.white)}>
        <span {...stylex.props(s.mono, s.mono14, s.spaced)}>{art.code.eyebrow}</span>
        <span {...stylex.props(s.codeTitle)}>{art.code.title}</span>
        <span {...stylex.props(s.small)}>{art.code.body}</span>
        <div {...stylex.props(s.digits)}>
          {art.code.digits.map((digit, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the cells are a fixed row of six
              key={index}
              {...stylex.props(s.digit, index === ACTIVE_DIGIT && s.digitActive)}
            >
              {digit}
            </span>
          ))}
        </div>
        <span {...stylex.props(s.codeSubmit, s.soft)}>{art.code.submit}</span>
      </div>
    </div>
  );
}

function TodayArt() {
  return (
    <div aria-hidden {...stylex.props(s.panel, s.panelPad, s.seasonSoft, s.todayFrame)}>
      <div {...stylex.props(s.column, s.card16, s.gap12, s.block1)}>
        <Badge n={1} />
        <span {...stylex.props(s.bar, s.bar28)} />
        <span {...stylex.props(s.previewRule)} />
        <span {...stylex.props(s.bar, s.bar18)} />
        <span {...stylex.props(s.previewRule)} />
        <span {...stylex.props(s.bar, s.bar12a)} />
        <span {...stylex.props(s.bar, s.bar12b)} />
      </div>
      <div {...stylex.props(s.column, s.card16, s.gap8, s.white)}>
        <Badge n={2} />
        <span {...stylex.props(s.faces)}>
          <span {...stylex.props(s.face, s.block2)} />
          <span {...stylex.props(s.face, s.faceOverlap, s.block3)} />
          <span {...stylex.props(s.face, s.faceOverlap, s.block4)} />
        </span>
        <span {...stylex.props(s.slot, s.slotPast)} />
        <span {...stylex.props(s.slot, s.slotNow, s.block2)} />
        <span {...stylex.props(s.slot, s.slotFree)} />
        <span {...stylex.props(s.slot, s.slotNext, s.block3)} />
      </div>
      <div {...stylex.props(s.column, s.gap12)}>
        <div {...stylex.props(s.column, s.card16, s.gap12, s.white, s.grow1)}>
          <Badge n={3} />
          <span {...stylex.props(s.noteSlab)} />
        </div>
        <div {...stylex.props(s.photoCard, s.white)}>
          <span {...stylex.props(s.photoSlab, s.block4)} />
        </div>
      </div>
    </div>
  );
}

function CalendarArt() {
  const { week, sentence, who } = art;

  return (
    <div aria-hidden {...stylex.props(s.column, s.panel, s.panelPad, s.seasonSoft, s.settings)}>
      <div {...stylex.props(s.column, s.week, s.white)}>
        <div {...stylex.props(s.weekHead)}>
          <span {...stylex.props(s.column, s.gap2)}>
            <span {...stylex.props(s.mono, s.mono13)}>{week.range}</span>
            <span {...stylex.props(s.month)}>{week.month}</span>
          </span>
          <span {...stylex.props(s.arrows)}>
            <IconDisc icon={ChevronLeft} size={18} xstyle={[s.circle36, s.soft]} />
            <IconDisc icon={ChevronRight} size={18} xstyle={[s.circle36, s.soft]} />
          </span>
        </div>
        <div {...stylex.props(s.days)}>
          {week.days.map((day) => (
            <span key={day.day} {...stylex.props(s.day)}>
              <span {...stylex.props(s.mono, s.mono12)}>{day.weekday}</span>
              <span
                {...stylex.props(
                  s.circle36,
                  s.center,
                  s.dayNumber,
                  day.day === week.today && s.ink,
                )}
              >
                {day.day}
              </span>
              <span {...stylex.props(s.dot6, day.events && s.accent)} />
            </span>
          ))}
        </div>
      </div>
      <div {...stylex.props(s.column, s.sentenceCard, s.block1)}>
        <div {...stylex.props(s.taskBar)}>
          <IconDisc icon={ArrowLeft} size={20} xstyle={[s.circle44, s.white]} />
          <span {...stylex.props(s.taskTitle)}>{sentence.title}</span>
          <span {...stylex.props(s.pill, s.save, s.ink)}>
            <Icon icon={Check} size={18} />
            {sentence.save}
          </span>
        </div>
        <p {...stylex.props(s.sentence)}>
          <span {...stylex.props(s.word, s.wordSet)}>{sentence.what}</span>
          {sentence.joins.on}
          <span {...stylex.props(s.word, s.wordSet, s.nowrap)}>{sentence.day}</span>
          {sentence.joins.from}
          <span {...stylex.props(s.word, s.wordSet, s.nowrap)}>{sentence.start}</span>
          {sentence.joins.to}
          <span {...stylex.props(s.word, s.wordSet, s.nowrap)}>{sentence.end}</span>
          {sentence.joins.for}
          <span {...stylex.props(s.wordActive)}>{sentence.who}</span>
          {sentence.joins.at}
          <span {...stylex.props(s.word)}>{sentence.where}</span>
          {sentence.joins.end}
        </p>
      </div>
      <div {...stylex.props(s.column, s.pickerCard, s.white)}>
        <div {...stylex.props(s.weekHead)}>
          <span {...stylex.props(s.mono, s.mono14)}>{who.eyebrow}</span>
          <span {...stylex.props(s.pill, s.chip, s.soft)}>
            {who.next}
            <Icon icon={ArrowRight} size={16} />
          </span>
        </div>
        <span {...stylex.props(s.chips)}>
          <span {...stylex.props(s.pill, s.chip, s.soft)}>
            <Icon icon={Users} size={16} />
            {who.everyone}
          </span>
          {who.people.map((name, index) => (
            <span
              key={name}
              {...stylex.props(s.pill, s.chip, s.chipPerson, index === 0 ? s.ink : s.soft)}
            >
              <span {...stylex.props(s.dot16, [s.block3, s.block2, s.block4][index])} />
              {name}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function WeatherArt() {
  const { weather } = art;

  return (
    <div aria-hidden {...stylex.props(s.column, s.panel, s.panelPadMd, s.block3, s.weather)}>
      <span {...stylex.props(s.mono, s.mono14, s.spaced)}>{weather.eyebrow}</span>
      <div {...stylex.props(s.weatherRow)}>
        <span {...stylex.props(s.weatherTemp)}>{weather.temp}</span>
        <Icon icon={CloudSun} size={88} strokeWidth={1.25} />
      </div>
      <span {...stylex.props(s.summary)}>{weather.summary}</span>
      <div {...stylex.props(s.forecast)}>
        {weather.days.map((day, index) => (
          <span key={day.day} {...stylex.props(s.forecastDay, index === 0 ? s.ink : s.white)}>
            <span {...stylex.props(s.mono, s.mono12)}>{day.day}</span>
            <Icon icon={FORECAST_ICONS[index] ?? CloudSun} size={22} />
            <span {...stylex.props(s.high)}>{day.high}</span>
            <span {...stylex.props(s.low)}>{day.low}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NotesArt() {
  return (
    <div aria-hidden {...stylex.props(s.panel, s.panelPadLg, s.block2, s.notes)}>
      {art.notes.map((note, index) => (
        <StickyNote
          key={note.text}
          author={note.author}
          time={note.time}
          rotate={NOTE_TILTS[index]}
          width="100%"
          minHeight={170}
        >
          <span {...stylex.props(s.noteText)}>{note.text}</span>
        </StickyNote>
      ))}
    </div>
  );
}

function PhotosArt() {
  const { photo } = art;

  return (
    <div aria-hidden {...stylex.props(s.panel, s.panelPad, s.seasonSoft, s.photos)}>
      <div {...stylex.props(s.column, s.card16, s.gap12, s.white, s.span2)}>
        <span {...stylex.props(s.bigPhoto, s.block1)}>
          <Icon icon={Image} size={48} strokeWidth={1.25} />
        </span>
        <div {...stylex.props(s.photoMeta)}>
          <span {...stylex.props(s.column, s.gap4)}>
            <span {...stylex.props(s.photoTitle)}>{photo.title}</span>
            <span {...stylex.props(s.mono, s.mono14)}>{photo.date}</span>
          </span>
          <span {...stylex.props(s.controls)}>
            <IconDisc icon={ChevronLeft} size={20} xstyle={[s.circle44, s.soft]} />
            <IconDisc icon={Pause} size={20} xstyle={[s.circle44, s.ink]} />
            <IconDisc icon={ChevronRight} size={20} xstyle={[s.circle44, s.soft]} />
            <IconDisc icon={Maximize} size={20} xstyle={[s.circle44, s.soft]} />
          </span>
        </div>
        <span {...stylex.props(s.pill, s.background)}>
          <Icon icon={Image} size={18} />
          {photo.background}
        </span>
      </div>
      <div {...stylex.props(s.thumbs, s.span2)}>
        <span {...stylex.props(s.thumb, s.block1, s.thumbOn)} />
        <span {...stylex.props(s.thumb, s.block2)} />
        <span {...stylex.props(s.thumb, s.block3)} />
        <span {...stylex.props(s.thumb, s.block4)} />
      </div>
    </div>
  );
}

function SettingsArt({ season }: { season: Season }) {
  const rows = [
    { id: "auto", label: art.season.auto, icon: CalendarDays },
    ...SEASONS.map((id) => ({ id, label: copy.season[id], icon: seasonIcons[id] })),
  ];

  return (
    <div aria-hidden {...stylex.props(s.column, s.settings)}>
      <div {...stylex.props(s.column, s.seasonCard, s.white)}>
        <span {...stylex.props(s.mono, s.mono14, s.seasonEyebrow)}>
          {art.season.eyebrow(art.season.following(copy.season[season]))}
        </span>
        {rows.map((row) => (
          <span key={row.id} {...stylex.props(s.seasonRow)}>
            <span {...stylex.props(s.radio)}>
              {row.id === "auto" && <span {...stylex.props(s.radioDot)} />}
            </span>
            <Icon icon={row.icon} size={20} />
            <span {...stylex.props(s.seasonLabel, row.id === "auto" && s.seasonLabelOn)}>
              {row.label}
            </span>
          </span>
        ))}
      </div>
      <div {...stylex.props(s.swatches)}>
        {SEASONS.map((id) => (
          <div key={id} data-season={id} {...stylex.props(s.column, s.swatch, SEASON_THEMES[id])}>
            <span {...stylex.props(s.swatchGrid)}>
              <span {...stylex.props(s.block1)} />
              <span {...stylex.props(s.block2)} />
              <span {...stylex.props(s.block3)} />
              <span {...stylex.props(s.block4)} />
            </span>
            <span {...stylex.props(s.mono, s.mono13)}>{copy.season[id]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsDataArt() {
  return (
    <div aria-hidden {...stylex.props(s.panel, s.panelPadLg, s.block3)}>
      <div {...stylex.props(s.column, s.dataCard, s.white)}>
        {art.eventsData.map((row, index) => (
          <div
            key={row.title}
            {...stylex.props(s.dataRow, index < art.eventsData.length - 1 && s.dataRule)}
          >
            <span {...stylex.props(s.column, s.dataWords)}>
              <span {...stylex.props(s.dataTitle)}>{row.title}</span>
              <span {...stylex.props(s.dataBody)}>{row.body}</span>
            </span>
            <DataEnd icon={EVENTS_DATA_BUTTONS[index] ?? null} label={row.end} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DataEnd({ icon, label }: { icon: LucideIcon | null; label: string }) {
  if (icon === null) {
    return (
      <span {...stylex.props(s.dataLink)}>
        {label}
        <Icon icon={ChevronRight} size={22} />
      </span>
    );
  }

  return (
    <span {...stylex.props(s.pill, s.dataButton)}>
      <Icon icon={icon} size={18} />
      {label}
    </span>
  );
}

function AmbientArt() {
  const { ambient } = art;

  return (
    <div aria-hidden {...stylex.props(s.panel, s.ambient)}>
      <span {...stylex.props(s.mono, s.mono14, s.iconLine)}>
        <Icon icon={MapPin} size={18} />
        {ambient.place}
      </span>
      <span {...stylex.props(s.ambientRow)}>
        <span {...stylex.props(s.ambientClock)}>{ambient.time}</span>
        <span {...stylex.props(s.ambientTemp)}>
          <Icon icon={Moon} size={32} strokeWidth={1.5} />
          {ambient.temp}
        </span>
      </span>
      <span {...stylex.props(s.column, s.gap6)}>
        <span {...stylex.props(s.mono, s.mono14)}>{ambient.next}</span>
        <span {...stylex.props(s.ambientTitle)}>{ambient.title}</span>
      </span>
      <span {...stylex.props(s.mono, s.mono14)}>{ambient.wake}</span>
    </div>
  );
}

function ReminderArt() {
  const { reminder } = art;

  return (
    <div aria-hidden {...stylex.props(s.column, s.panel, s.panelPad, s.seasonSoft, s.reminders)}>
      <div {...stylex.props(s.strip, s.ink)}>
        <Icon icon={Bell} size={28} />
        <span {...stylex.props(s.column, s.stripText)}>
          <span {...stylex.props(s.mono, s.mono13, s.stripEyebrow)}>
            <span {...stylex.props(s.dot10, s.block3)} />
            {reminder.eyebrow}
          </span>
          <span {...stylex.props(s.stripTitle)}>{reminder.title}</span>
        </span>
        <span {...stylex.props(s.pill, s.details)}>
          {reminder.action}
          <Icon icon={ArrowRight} size={18} />
        </span>
        <span {...stylex.props(s.progress)}>
          <span {...stylex.props(s.progressFill)} />
        </span>
      </div>
      <div {...stylex.props(s.behind)}>
        <span {...stylex.props(s.rounded16, s.block1)} />
        <span {...stylex.props(s.rounded16, s.white)} />
      </div>
    </div>
  );
}

function PhoneArt() {
  const { phone } = art;

  return (
    <div aria-hidden {...stylex.props(s.panel, s.panelPadMd, s.block4, s.phone)}>
      <div {...stylex.props(s.column, s.scanCard, s.white)}>
        <span {...stylex.props(s.mono, s.mono13)}>{phone.scan}</span>
        <IconDisc icon={QrCode} size={88} strokeWidth={1.25} xstyle={s.qr} />
        <span {...stylex.props(s.mono, s.mono13)}>{phone.expires}</span>
      </div>
      <div {...stylex.props(s.handset)}>
        <div {...stylex.props(s.column, s.handsetScreen)}>
          <IconDisc icon={QrCode} size={64} strokeWidth={1.25} xstyle={s.viewfinder} />
          <span {...stylex.props(s.point)}>{phone.point}</span>
          <span {...stylex.props(s.pill, s.cancel)}>{phone.cancel}</span>
        </div>
      </div>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return <span {...stylex.props(s.badge)}>{n}</span>;
}

function IconDisc({
  icon,
  size,
  strokeWidth,
  xstyle,
}: {
  icon: LucideIcon;
  size: number;
  strokeWidth?: number;
  xstyle: stylex.StyleXStyles;
}) {
  return (
    <span {...stylex.props(s.center, xstyle)}>
      <Icon icon={icon} size={size} strokeWidth={strokeWidth} />
    </span>
  );
}
