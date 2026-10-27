"use client";

import * as stylex from "@stylexjs/stylex";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
  Sun,
  Users,
  X,
} from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { type EventWord, nextWord } from "@/domain/eventSentence";
import {
  defaultEnd,
  isEndHourDisabled,
  isEndMinuteDisabled,
  type Meridiem,
  pickerHours,
  pickerMinutes,
  withHour,
  withMeridiem,
  withMinute,
} from "@/domain/eventTimes";
import { monthCells, monthOf, monthTitle, stepMonth } from "@/domain/quickDate";
import type { Tag, TagColor } from "@/domain/schemas";
import { suggestTags } from "@/domain/tagMatch";
import { exactTag, nextFreeColor, pickWho } from "@/domain/tags";
import {
  type Clock,
  formatDayName,
  formatHour,
  formatLength,
  formatMonthDay,
  formatWeekday,
} from "@/domain/time";
import { addDays, parseDateKey } from "@/domain/zone";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { MeridiemToggle } from "@/ui/MeridiemToggle";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";
import type { EventPageAction, PageDraft } from "../eventPage";
import { NewMember, Suggestions } from "./WhoField";

type EventPickerProps = {
  breakpoint: Breakpoint;
  word: EventWord;
  draft: PageDraft;
  today: string;
  clock: Clock;
  tags: readonly Tag[];
  recentTitles: readonly string[];
  recentPlaces: readonly string[];
  onAction: (action: EventPageAction) => void;
  onCreateTag: (name: string, color: TagColor) => string;
};

type BodyProps = EventPickerProps;

type ChipProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

type CellProps = {
  label: string;
  name: string;
  selected: boolean;
  disabled: boolean;
  breakpoint: Breakpoint;
  onClick: () => void;
};

type RowProps = { title: string; breakpoint: Breakpoint; children: ReactNode; cells?: boolean };

type ArrowProps = { icon: LucideIcon; label: string; disabled?: boolean; onClick: () => void };

type TextField = HTMLInputElement | HTMLTextAreaElement;

const words = copy.events.picker;

const fields = copy.events.page.fields;

const MAX_TITLE = 140;

const MAX_PLACE = 60;

const MAX_NOTES = 280;

const MAX_NAME = 32;

const WEEK = 7;

const styles = stylex.create({
  card: {
    flexGrow: 1,
    flexShrink: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  header: {
    flexShrink: 0,
    minHeight: 44,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px 16px",
  },
  eyebrow: {
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  spacer: { flexGrow: 1 },
  soft: { backgroundColor: colors.surfaceSoft },
  meridiem: {
    flexShrink: 0,
    width: 128,
    backgroundColor: colors.surfaceSoft,
    boxShadow: "none",
  },
  allDay: {
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingBlock: 0,
    paddingInlineStart: 14,
    paddingInlineEnd: 20,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 16,
    fontWeight: 480,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transitionProperty: "transform, background-color, color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}, ${motion.durFast}`,
  },
  allDayOn: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    fontWeight: 540,
  },
  sun: {
    display: "flex",
    transform: "none",
    transitionProperty: "transform",
    transitionDuration: { default: "420ms", "@media (prefers-reduced-motion: reduce)": "0ms" },
    transitionTimingFunction: "cubic-bezier(.2,.7,.2,1)",
  },
  sunOn: { transform: "rotate(180deg) scale(1.15)" },
  input: {
    flexShrink: 0,
    width: "100%",
    boxSizing: "border-box",
    paddingBlock: 14,
    paddingInline: 20,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.borderHairline, ":focus": colors.black },
    borderRadius: radii.md,
    boxShadow: { default: "none", ":focus": `0 0 0 1px ${colors.black}` },
    outline: "none",
    resize: "none",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    fontFamily: type.fontSans,
    fontWeight: 400,
    letterSpacing: "-0.3px",
    lineHeight: 1.3,
  },
  notes: {
    paddingBlock: 16,
    fontSize: 20,
    letterSpacing: "normal",
    lineHeight: 1.4,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  chips: {
    margin: 0,
    padding: 0,
    minWidth: 0,
    borderWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    paddingBlock: 0,
    paddingInline: 20,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 16,
    fontWeight: 480,
    cursor: "pointer",
    transitionProperty: "transform, background-color, color",
    transitionDuration: `${motion.durPress}, 240ms, 240ms`,
  },
  picked: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    fontWeight: 540,
  },
  person: {
    minHeight: 52,
    paddingInlineStart: 16,
    paddingInlineEnd: 22,
    fontSize: 17,
  },
  day: {
    minHeight: 52,
    justifyContent: "space-between",
    gap: 16,
  },
  dayLabel: { fontSize: 17, fontWeight: 540 },
  mono: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
  dayColumns: {
    display: "grid",
    alignItems: "start",
  },
  month: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  monthHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  monthTitle: { fontSize: 17, fontWeight: 540 },
  arrow: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: { default: colors.textPrimary, ":disabled": colors.textPlaceholder },
    cursor: { default: "pointer", ":disabled": "default" },
  },
  monthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 2,
  },
  weekday: {
    paddingBottom: 4,
    textAlign: "center",
  },
  date: {
    height: 44,
    minWidth: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: { default: colors.textPrimary, ":disabled": colors.textPlaceholder },
    fontFamily: "inherit",
    fontSize: 16,
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
    cursor: { default: "pointer", ":disabled": "default" },
    transitionProperty: "background-color",
    transitionDuration: motion.durFast,
  },
  today: {
    boxShadow: `inset 0 0 0 2px ${colors.black}`,
    fontWeight: 540,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  row: {
    display: "grid",
    alignItems: "center",
    gap: "8px 16px",
  },
  cells: {
    margin: 0,
    padding: 0,
    minWidth: 0,
    borderWidth: 0,
    display: "grid",
    gap: 6,
  },
  lengths: {
    margin: 0,
    padding: 0,
    minWidth: 0,
    borderWidth: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  cell: {
    minWidth: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    transitionProperty: "transform, background-color, color",
    transitionDuration: `${motion.durPress}, 240ms, 240ms`,
  },
  cellOff: {
    backgroundColor: "transparent",
    color: colors.textPlaceholder,
    cursor: "default",
  },
  lengthCell: {
    paddingInline: 20,
    fontSize: 16,
    whiteSpace: "nowrap",
  },
  who: {
    minHeight: 56,
    paddingBlock: 0,
    fontSize: type.bodySize,
  },
});

const cardSizes = stylex.create({
  large: { paddingTop: 28, paddingInline: 48, paddingBottom: 36 },
  normal: { paddingTop: 24, paddingInline: 32, paddingBottom: 32 },
  small: { padding: 20 },
});

const inputSizes = stylex.create({
  large: { minHeight: 72, fontSize: 32 },
  normal: { minHeight: 64, fontSize: 28 },
  small: { minHeight: 56, fontSize: 22 },
});

const dayColumnSizes = stylex.create({
  large: { gridTemplateColumns: "300px minmax(0, 480px)", gap: 56 },
  normal: { gridTemplateColumns: "260px minmax(0, 440px)", gap: 48 },
  small: { gridTemplateColumns: "minmax(0, 1fr)", gap: 20 },
});

const quickSizes = stylex.create({
  large: { flexDirection: "column", flexWrap: "nowrap" },
  normal: { flexDirection: "column", flexWrap: "nowrap" },
  small: { flexDirection: "row" },
});

const rowSizes = stylex.create({
  large: { gridTemplateColumns: "96px minmax(0, 1fr)" },
  normal: { gridTemplateColumns: "96px minmax(0, 1fr)" },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

const cellsSizes = stylex.create({
  large: { gridTemplateColumns: "repeat(12, minmax(0, 1fr))" },
  normal: { gridTemplateColumns: "repeat(12, minmax(0, 1fr))" },
  small: { gridTemplateColumns: "repeat(6, minmax(0, 1fr))" },
});

const cellHeights = stylex.create({
  large: { height: 56 },
  normal: { height: 52 },
  small: { height: 44 },
});

export function EventPicker(props: EventPickerProps) {
  const { breakpoint, word } = props;

  const label = headerLabel(props);

  return (
    <section aria-label={label} {...stylex.props(styles.card, cardSizes[breakpoint])}>
      <Header {...props} label={label} />
      {word === "title" && <TitleBody {...props} />}
      {word === "day" && <DayBody {...props} />}
      {(word === "start" || word === "end") && <TimeBody {...props} />}
      {word === "who" && <WhoBody {...props} />}
      {word === "where" && <WhereBody {...props} />}
      {word === "notes" && <NotesBody {...props} />}
    </section>
  );
}

function Header({
  breakpoint,
  word,
  draft,
  clock,
  onAction,
  label,
}: BodyProps & { label: string }) {
  const next = nextWord(word, { allDay: draft.allDay, hasEnd: draft.end !== undefined });

  const timed = word === "start" || word === "end";

  const value = word === "end" ? (draft.end ?? defaultEnd(draft.start)) : draft.start;

  const off = word === "start" && draft.allDay === true;

  const pick = (minutes: number) =>
    onAction({ type: word === "end" ? "end" : "start", value: minutes });

  return (
    <div {...stylex.props(styles.header)}>
      <Eyebrow xstyle={styles.eyebrow}>{label}</Eyebrow>
      {timed && clock === "12h" && (
        <MeridiemToggle
          label={words.meridiem}
          value={meridiemOf(value)}
          disabled={off}
          onChange={(meridiem: Meridiem) => pick(withMeridiem(value, meridiem))}
          xstyle={styles.meridiem}
        />
      )}
      {word === "start" && <AllDayChip on={off} onAction={onAction} />}
      <span {...stylex.props(styles.spacer)} />
      {next && (
        <Button
          variant="ghost"
          iconRight={ArrowRight}
          onClick={() => onAction({ type: "next" })}
          xstyle={styles.soft}
        >
          {breakpoint === "small" ? words.next : words.nextTo(fields[next])}
        </Button>
      )}
    </div>
  );
}

function AllDayChip({ on, onAction }: { on: boolean; onAction: EventPickerProps["onAction"] }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onAction({ type: "allDay", value: !on })}
      {...stylex.props(styles.allDay, on && styles.allDayOn, press.scale)}
    >
      <span {...stylex.props(styles.sun, on && styles.sunOn)}>
        <Icon icon={Sun} size={18} />
      </span>
      {words.allDay}
    </button>
  );
}

function TitleBody({ breakpoint, draft, recentTitles, onAction }: BodyProps) {
  const ref = useFocusAtEnd<HTMLTextAreaElement>();

  const pickRecent = (title: string) => {
    onAction({ type: "title", value: title });
    onAction({ type: "select", word: "day" });
  };

  return (
    <>
      <textarea
        ref={ref}
        aria-label={fields.title}
        value={draft.title}
        rows={2}
        maxLength={MAX_TITLE}
        placeholder={words.titlePlaceholder}
        onChange={(event) =>
          onAction({ type: "title", value: event.target.value.replace(/\n/g, " ") })
        }
        onKeyDown={enterIsNext(onAction)}
        {...stylex.props(styles.input, inputSizes[breakpoint])}
      />
      <Recent
        title={words.recent}
        values={recentTitles}
        current={draft.title}
        onPick={pickRecent}
      />
    </>
  );
}

function DayBody({ breakpoint, draft, today, onAction }: BodyProps) {
  const [month, setMonth] = useState(monthOf(draft.day));

  const pick = (day: string) => onAction({ type: "day", value: day });

  const quick = [
    { label: words.today, day: today },
    { label: words.tomorrow, day: addDays(today, 1) },
    { label: words.nextWeek, day: addDays(today, WEEK) },
  ];

  return (
    <div {...stylex.props(styles.dayColumns, dayColumnSizes[breakpoint])}>
      <div {...stylex.props(styles.chips, quickSizes[breakpoint])}>
        {quick.map(({ label, day }) => (
          <Chip
            key={label}
            selected={draft.day === day}
            onClick={() => pick(day)}
            xstyle={styles.day}
          >
            <span {...stylex.props(styles.dayLabel)}>{label}</span>
            <span {...stylex.props(styles.mono)}>{shortDay(day)}</span>
          </Chip>
        ))}
      </div>
      <div {...stylex.props(styles.month)}>
        <div {...stylex.props(styles.monthHead)}>
          <MonthArrow
            icon={ChevronLeft}
            label={words.previousMonth}
            disabled={month <= monthOf(today)}
            onClick={() => setMonth(stepMonth(month, -1))}
          />
          <span aria-live="polite" {...stylex.props(styles.monthTitle)}>
            {monthTitle(month)}
          </span>
          <MonthArrow
            icon={ChevronRight}
            label={words.nextMonth}
            onClick={() => setMonth(stepMonth(month, 1))}
          />
        </div>
        <div {...stylex.props(styles.monthGrid)}>
          {words.weekdays.map((letter, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the seven weekday letters repeat and never reorder
            <span key={index} aria-hidden="true" {...stylex.props(styles.mono, styles.weekday)}>
              {letter}
            </span>
          ))}
          {monthCells(month).map((day, index) =>
            day === null ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: blank leading cells have no other identity
              <span key={index} />
            ) : (
              <button
                key={day}
                type="button"
                aria-label={words.dayCell(formatDayName(parseDateKey(day), "UTC"), day === today)}
                aria-pressed={day === draft.day}
                aria-current={day === today ? "date" : undefined}
                disabled={day < today}
                onClick={() => pick(day)}
                {...stylex.props(
                  styles.date,
                  day === today && day !== draft.day && styles.today,
                  day === draft.day && styles.picked,
                )}
              >
                {parseDateKey(day).getUTCDate()}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function TimeBody({ breakpoint, word, draft, clock, onAction }: BodyProps) {
  const end = word === "end";

  const value = end ? (draft.end ?? defaultEnd(draft.start)) : draft.start;

  const off = !end && draft.allDay === true;

  const hour = Math.floor(value / 60);

  const minute = value % 60;

  const pick = (minutes: number) => onAction({ type: end ? "end" : "start", value: minutes });

  return (
    <div {...stylex.props(styles.rows)}>
      <Row title={words.hour} breakpoint={breakpoint} cells>
        {pickerHours(clock, meridiemOf(value)).map((h) => (
          <Cell
            key={h}
            {...hourCell(h, clock)}
            breakpoint={breakpoint}
            selected={!off && h === hour}
            disabled={off || (end && isEndHourDisabled(draft.start, h))}
            onClick={() => pick(withHour(value, h))}
          />
        ))}
      </Row>
      <Row title={words.minutes} breakpoint={breakpoint} cells>
        {pickerMinutes(5).map((m) => (
          <Cell
            key={m}
            label={`:${pad(m)}`}
            name={words.minuteCell(pad(m))}
            breakpoint={breakpoint}
            selected={!off && m === minute}
            disabled={off || (end && isEndMinuteDisabled(draft.start, hour, m))}
            onClick={() => pick(withMinute(value, m))}
          />
        ))}
      </Row>
      {end && (
        <Row title={words.length} breakpoint={breakpoint}>
          {words.lengths.map((length) => (
            <button
              key={length.value}
              type="button"
              aria-pressed={draft.end !== undefined && draft.end - draft.start === length.value}
              onClick={() => onAction({ type: "length", minutes: length.value })}
              {...stylex.props(
                styles.cell,
                styles.lengthCell,
                cellHeights[breakpoint],
                draft.end !== undefined &&
                  draft.end - draft.start === length.value &&
                  styles.picked,
                press.scale,
              )}
            >
              {length.label}
            </button>
          ))}
          <Button variant="ghost" icon={X} onClick={() => onAction({ type: "noEnd" })}>
            {words.noEnd}
          </Button>
        </Row>
      )}
    </div>
  );
}

function WhoBody({ draft, tags, onAction, onCreateTag }: BodyProps) {
  const [input, setInput] = useState("");

  const [color, setColor] = useState<TagColor | null>(null);

  const allIds = tags.map((tag) => tag.id);

  const everyone = allIds.every((id) => draft.tagIds.includes(id));

  const name = input.trim();

  const exact = exactTag(tags, input);

  const add = (id: string) => {
    if (!draft.tagIds.includes(id)) onAction({ type: "who", tagIds: [...draft.tagIds, id] });

    setInput("");
  };

  const create = () => {
    add(onCreateTag(name, color ?? nextFreeColor(tags)));

    setColor(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (exact) add(exact.id);
    else if (name !== "") create();
  };

  return (
    <>
      <fieldset aria-label={fields.who} {...stylex.props(styles.chips)}>
        <Chip
          selected={everyone}
          onClick={() => onAction({ type: "who", tagIds: pickWho(draft.tagIds, allIds) })}
          xstyle={styles.person}
        >
          <Icon icon={Users} size={18} />
          {copy.events.everyone}
        </Chip>
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            selected={!everyone && draft.tagIds.includes(tag.id)}
            onClick={() => onAction({ type: "who", tagIds: pickWho(draft.tagIds, allIds, tag.id) })}
            xstyle={styles.person}
          >
            <PersonDot color={tag.color} />
            {tag.name}
          </Chip>
        ))}
      </fieldset>
      <input
        type="text"
        aria-label={words.addPerson}
        autoComplete="off"
        value={input}
        maxLength={MAX_NAME}
        placeholder={words.addPerson}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={onKeyDown}
        {...stylex.props(styles.input, styles.who)}
      />
      {name !== "" && !exact && (
        <NewMember
          name={name}
          color={color ?? nextFreeColor(tags)}
          onColor={setColor}
          onCreate={create}
        />
      )}
      <Suggestions tags={suggestTags(tags, input, draft.tagIds)} onAdd={add} />
    </>
  );
}

function WhereBody({ breakpoint, draft, recentPlaces, onAction }: BodyProps) {
  const ref = useFocusAtEnd<HTMLInputElement>();

  return (
    <>
      <input
        ref={ref}
        type="text"
        aria-label={fields.where}
        value={draft.location}
        maxLength={MAX_PLACE}
        placeholder={words.wherePlaceholder}
        onChange={(event) => onAction({ type: "location", value: event.target.value })}
        onKeyDown={enterIsNext(onAction)}
        {...stylex.props(styles.input, inputSizes[breakpoint])}
      />
      <Recent
        title={words.recentPlaces}
        values={recentPlaces}
        current={draft.location}
        onPick={(place) => onAction({ type: "location", value: place })}
      />
    </>
  );
}

function NotesBody({ draft, onAction }: BodyProps) {
  const ref = useFocusAtEnd<HTMLTextAreaElement>();

  return (
    <textarea
      ref={ref}
      aria-label={fields.notes}
      value={draft.notes}
      rows={4}
      maxLength={MAX_NOTES}
      placeholder={words.notesPlaceholder}
      onChange={(event) => onAction({ type: "notes", value: event.target.value })}
      {...stylex.props(styles.input, styles.notes)}
    />
  );
}

function Recent({
  title,
  values,
  current,
  onPick,
}: {
  title: string;
  values: readonly string[];
  current: string;
  onPick: (value: string) => void;
}) {
  if (values.length === 0) return null;

  return (
    <div {...stylex.props(styles.stack)}>
      <Eyebrow>{title}</Eyebrow>
      <fieldset aria-label={title} {...stylex.props(styles.chips)}>
        {values.map((value) => (
          <Chip key={value} selected={current === value} onClick={() => onPick(value)}>
            {value}
          </Chip>
        ))}
      </fieldset>
    </div>
  );
}

function Chip({ selected, onClick, children, xstyle }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      {...stylex.props(styles.chip, xstyle, selected && styles.picked, press.scale)}
    >
      {children}
    </button>
  );
}

function Row({ title, breakpoint, children, cells }: RowProps) {
  return (
    <div {...stylex.props(styles.row, rowSizes[breakpoint])}>
      <span aria-hidden="true" {...stylex.props(styles.mono)}>
        {title}
      </span>
      <fieldset
        aria-label={title}
        {...stylex.props(cells ? styles.cells : styles.lengths, cells && cellsSizes[breakpoint])}
      >
        {children}
      </fieldset>
    </div>
  );
}

function Cell({ label, name, selected, disabled, breakpoint, onClick }: CellProps) {
  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      {...stylex.props(
        styles.cell,
        cellHeights[breakpoint],
        selected && styles.picked,
        disabled && styles.cellOff,
        !disabled && press.scale,
      )}
    >
      {label}
    </button>
  );
}

function MonthArrow({ icon, label, disabled, onClick }: ArrowProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      {...stylex.props(styles.arrow, !disabled && press.scale)}
    >
      <Icon icon={icon} size={20} />
    </button>
  );
}

function useFocusAtEnd<T extends TextField>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const field = ref.current;

    if (!field) return;

    field.focus({ preventScroll: true });

    field.setSelectionRange(field.value.length, field.value.length);
  }, []);

  return ref;
}

function enterIsNext(onAction: EventPickerProps["onAction"]) {
  return (event: KeyboardEvent<TextField>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    onAction({ type: "next" });
  };
}

function headerLabel({ breakpoint, word, draft }: EventPickerProps): string {
  if (word !== "end" || breakpoint === "small" || draft.end === undefined) return fields[word];

  return words.endsLength(formatLength(draft.end - draft.start));
}

function hourCell(hour: number, clock: Clock) {
  if (clock === "12h")
    return { label: String(hour % 12 || 12), name: formatHour(hour * 60, clock) };

  return { label: pad(hour), name: words.hour24Cell(pad(hour)) };
}

function meridiemOf(minutes: number): Meridiem {
  return minutes >= 12 * 60 ? "PM" : "AM";
}

function shortDay(day: string): string {
  const date = parseDateKey(day);

  return `${formatWeekday(date, "UTC")}, ${formatMonthDay(date, "UTC")}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
