import * as stylex from "@stylexjs/stylex";
import { ArrowRight, CalendarDays, CloudOff, Plus, Sun, Trash2, Umbrella } from "lucide-react";
import { useState } from "react";
import { copy } from "@/copy";
import { IDLE_MINUTES, type Season, type Tone } from "@/domain/schemas";
import type { Clock as ClockFormat } from "@/domain/time";
import { colors, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Clock } from "@/ui/Clock";
import { ColorBlock } from "@/ui/ColorBlock";
import { ColorSwatchPicker } from "@/ui/ColorSwatchPicker";
import { EmptyState } from "@/ui/EmptyState";
import { Eyebrow } from "@/ui/Eyebrow";
import { ForecastDay } from "@/ui/ForecastDay";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { OfflinePill } from "@/ui/OfflinePill";
import { PillTabs } from "@/ui/PillTabs";
import { Radio } from "@/ui/Radio";
import { SettingsRow } from "@/ui/SettingsRow";
import { Sheet } from "@/ui/Sheet";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { Slider } from "@/ui/Slider";
import { SourceFailure } from "@/ui/SourceFailure";
import { StickyNote } from "@/ui/StickyNote";
import { Switch } from "@/ui/Switch";
import { seasonIcons } from "@/ui/seasonIcons";
import { TextInput } from "@/ui/TextInput";
import { WeatherNow } from "@/ui/WeatherNow";
import { Zone } from "@/ui/Zone";
import { AmbientGallery } from "./AmbientGallery";
import { CalendarGallery } from "./CalendarGallery";
import { EventFullPageGallery } from "./EventFullPageGallery";
import { EventPageGallery, EventPickerGallery } from "./EventPageGallery";
import { GalleryGroup } from "./GalleryGroup";
import { NotesGallery } from "./NotesGallery";
import { PersonFilterGallery } from "./PersonFilterGallery";
import { PhotosGallery } from "./PhotosGallery";
import { ReminderGallery } from "./ReminderGallery";
import { SettingsGallery } from "./SettingsGallery";
import { SidebarGallery } from "./SidebarGallery";
import { SignInGallery } from "./SignInGallery";
import {
  FORECAST,
  GALLERY_TZ,
  gallery,
  NOTES,
  NOW,
  SWATCHES,
  WEATHER,
  ZONE_STATES,
} from "./samples";
import { TimeEntryDemo } from "./TimeEntryDemo";
import { TimelineGallery } from "./TimelineGallery";
import { TodayGallery } from "./TodayGallery";
import { WeatherGallery } from "./WeatherGallery";

type SeasonGalleryProps = {
  season: Season;
};

const ignore = () => {};

const BLOCK_TONES = [1, 2, 3, 4, "soft", "deep", "canvas", "ink"] as const;

const SEASON_RADIOS = (["spring", "summer", "fall", "winter"] as const).map((value) => ({
  value,
  label: copy.season[value],
  icon: seasonIcons[value],
}));

const styles = stylex.create({
  title: {
    margin: 0,
    paddingBlock: space.lg,
    fontSize: type.displayLgSize,
    fontWeight: type.displayLgWeight,
    lineHeight: type.displayLgLh,
    letterSpacing: type.displayLgLs,
  },
  wide: {
    width: "100%",
    maxWidth: 720,
  },
  small: {
    width: "100%",
    maxWidth: 358,
  },
  tile: {
    width: 280,
  },
  zone: {
    width: 280,
    minHeight: 160,
    padding: space.md,
    borderRadius: 24,
    backgroundColor: colors.surfaceSoft,
  },
  forecast: {
    display: "flex",
    gap: space.xs,
    overflowX: "auto",
  },
  inverse: {
    display: "flex",
    gap: space.xs,
  },
});

export function SeasonGallery({ season }: SeasonGalleryProps) {
  return (
    <>
      <h2 {...stylex.props(styles.title)}>{copy.season[season]}</h2>
      <CoreGroup />
      <FormsGroup />
      <SurfacesGroup />
      <CalendarGroup />
      <WeatherGroup />
      <NotesGroup />
      <NavigationGroup />
      <TimeGroup />
      <SharedGroup />
      <ZoneGroup />
      <TodayGallery season={season} />
      <CalendarGallery />
      <PersonFilterGallery />
      <TimelineGallery />
      <EventPageGallery />
      <EventPickerGallery />
      <EventFullPageGallery />
      <WeatherGallery />
      <NotesGallery />
      <PhotosGallery />
      <SettingsGallery season={season} />
      <AmbientGallery season={season} />
      <SignInGallery season={season} />
      <ReminderGallery />
    </>
  );
}

function CoreGroup() {
  const [tab, setTab] = useState<string>(gallery.tabs[0]);

  return (
    <GalleryGroup title={gallery.groups.core}>
      <Button icon={Plus}>{gallery.button}</Button>
      <Button variant="secondary">{gallery.button}</Button>
      <Button variant="ghost">{gallery.button}</Button>
      <Button variant="accent" iconRight={ArrowRight}>
        {gallery.button}
      </Button>
      <Button variant="primary" size="lg">
        {gallery.button}
      </Button>
      <Button variant="danger" icon={Trash2}>
        {gallery.danger}
      </Button>
      <Button disabled>{gallery.disabled}</Button>
      <IconButton icon={Plus} label={gallery.button} />
      <IconButton icon={Plus} label={gallery.button} variant="canvas" />
      <IconButton icon={Plus} label={gallery.button} variant="solid" />
      <IconButton icon={Plus} label={gallery.button} active />
      <ColorBlock tone="ink" padding="12px" xstyle={styles.inverse}>
        <Button variant="inverse">{gallery.button}</Button>
        <IconButton icon={Plus} label={gallery.button} variant="inverse" />
      </ColorBlock>
      <IconButton icon={Plus} label={gallery.button} size="touch" />
      <IconButton icon={Plus} label={gallery.button} size="lg" />
      <PillTabs options={gallery.tabs} value={tab} onChange={setTab} />
      <PillTabs options={gallery.tabs} value={tab} onChange={setTab} size="lg" />
      <Eyebrow>{gallery.card.eyebrow}</Eyebrow>
      <Eyebrow size="caption">{gallery.card.eyebrow}</Eyebrow>
      <Icon icon={Sun} size={20} />
      <Icon icon={Sun} />
      <Icon icon={Sun} size={48} />
    </GalleryGroup>
  );
}

function FormsGroup() {
  const [title, setTitle] = useState(gallery.input.value);
  const [note, setNote] = useState(gallery.input.notesValue);
  const [tone, setTone] = useState<Tone>(1);
  const [allDay, setAllDay] = useState(false);
  const [clock, setClock] = useState<ClockFormat>("12h");
  const [season, setSeason] = useState<Season>("fall");
  const [minutes, setMinutes] = useState(3);

  return (
    <GalleryGroup title={gallery.groups.forms}>
      <TextInput
        label={gallery.input.label}
        value={title}
        onChange={setTitle}
        xstyle={styles.tile}
      />
      <TextInput
        label={gallery.input.label}
        value=""
        placeholder={gallery.input.placeholder}
        onChange={ignore}
        size="lg"
        xstyle={styles.tile}
      />
      <TextInput
        label={gallery.input.label}
        value=""
        onChange={ignore}
        error={gallery.input.error}
        xstyle={styles.tile}
      />
      <TextInput
        label={gallery.input.notesLabel}
        value={note}
        onChange={setNote}
        multiline
        rows={3}
        xstyle={styles.tile}
      />
      <ColorSwatchPicker
        label={gallery.swatch}
        options={SWATCHES}
        value={tone}
        onChange={setTone}
      />
      <Switch label={gallery.switchLabel} checked={allDay} onChange={setAllDay} />
      <Switch label={gallery.switchLabel} checked onChange={ignore} />
      <Switch
        label={copy.settings.idle.title}
        checked={allDay}
        onChange={setAllDay}
        labelStyle="eyebrow"
      />
      <Radio
        label={copy.settings.clock.title}
        options={copy.settings.clock.options}
        value={clock}
        onChange={setClock}
      />
      <Radio
        label={copy.settings.season.title}
        options={SEASON_RADIOS}
        value={season}
        onChange={setSeason}
        direction="column"
      />
      <div {...stylex.props(styles.tile)}>
        <Slider
          label={copy.settings.idle.slider}
          min={IDLE_MINUTES.min}
          max={IDLE_MINUTES.max}
          value={minutes}
          valueText={copy.settings.idle.value(minutes)}
          minLabel={copy.settings.idle.value(IDLE_MINUTES.min)}
          maxLabel={copy.settings.idle.value(IDLE_MINUTES.max)}
          onChange={setMinutes}
        />
      </div>
      <div {...stylex.props(styles.tile)}>
        <Slider
          label={copy.settings.idle.slider}
          min={IDLE_MINUTES.min}
          max={IDLE_MINUTES.max}
          value={minutes}
          valueText={copy.settings.idle.value(minutes)}
          minLabel={copy.settings.idle.value(IDLE_MINUTES.min)}
          maxLabel={copy.settings.idle.value(IDLE_MINUTES.max)}
          onChange={setMinutes}
          disabled
        />
      </div>
    </GalleryGroup>
  );
}

function SurfacesGroup() {
  return (
    <GalleryGroup title={gallery.groups.surfaces}>
      {BLOCK_TONES.map((tone) => (
        <ColorBlock key={tone} tone={tone} padding="24px">
          <Eyebrow>{`${gallery.block} ${tone}`}</Eyebrow>
        </ColorBlock>
      ))}
      <Card variant="hairline" eyebrow={gallery.card.eyebrow} title={gallery.card.title}>
        {gallery.card.body}
      </Card>
      <Card variant="soft" eyebrow={gallery.card.eyebrow} title={gallery.card.title}>
        {gallery.card.body}
      </Card>
      <ColorBlock tone={1} padding="16px">
        <Card variant="canvas" eyebrow={gallery.card.eyebrow} title={gallery.card.title}>
          {gallery.card.body}
        </Card>
      </ColorBlock>
      <Card
        variant="elevated"
        eyebrow={gallery.card.eyebrow}
        title={gallery.card.title}
        onClick={ignore}
      >
        {gallery.card.body}
      </Card>
      {([1, 2, 3, 4, "soft"] as const).map((tone) => (
        <Banner
          key={tone}
          tone={tone}
          icon={Umbrella}
          title={gallery.banner.title}
          body={gallery.banner.body}
          actionLabel={gallery.banner.action}
          onAction={ignore}
        />
      ))}
    </GalleryGroup>
  );
}

function CalendarGroup() {
  return (
    <GalleryGroup title={gallery.groups.calendar}>
      <Clock tz={GALLERY_TZ} time={NOW} />
      <Clock tz={GALLERY_TZ} time={NOW} size="lg" hour12={false} />
      <Clock tz={GALLERY_TZ} time={NOW} size="lg" showDate={false} align="center" />
    </GalleryGroup>
  );
}

function WeatherGroup() {
  const [day, setDay] = useState(FORECAST[0]?.day);

  const condition = copy.weather.condition.partlyCloudy;

  return (
    <GalleryGroup title={gallery.groups.weather}>
      <WeatherNow
        {...WEATHER}
        condition={condition}
        labels={copy.weather.range}
        xstyle={styles.wide}
      />
      <WeatherNow
        {...WEATHER}
        condition={condition}
        labels={copy.weather.range}
        tone="deep"
        details={undefined}
        xstyle={styles.wide}
      />
      <WeatherNow
        {...WEATHER}
        condition={condition}
        labels={copy.weather.range}
        compact
        xstyle={styles.small}
      />
      <div {...stylex.props(styles.forecast)}>
        {FORECAST.map((forecast) => (
          <ForecastDay
            key={forecast.day}
            {...forecast}
            active={forecast.day === day}
            onClick={() => setDay(forecast.day)}
          />
        ))}
      </div>
    </GalleryGroup>
  );
}

function NotesGroup() {
  return (
    <GalleryGroup title={gallery.groups.notes}>
      {NOTES.map((note) => (
        <StickyNote
          key={note.text}
          author={note.author}
          time={note.time}
          rotate={note.rotate}
          width={220}
          onClick={ignore}
        >
          {note.text}
        </StickyNote>
      ))}
    </GalleryGroup>
  );
}

function NavigationGroup() {
  return (
    <GalleryGroup title={gallery.groups.navigation} column>
      <SidebarGallery />
    </GalleryGroup>
  );
}

function TimeGroup() {
  return (
    <GalleryGroup title={gallery.groups.time}>
      <TimeEntryDemo />
      <TimeEntryDemo compact />
    </GalleryGroup>
  );
}

function SharedGroup() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const closeSheet = () => setSheetOpen(false);

  return (
    <GalleryGroup title={gallery.groups.shared}>
      <Skeleton label={gallery.skeleton} xstyle={styles.tile}>
        <SkeletonBlock height={24} width="60%" />
        <SkeletonBlock height={56} />
        <SkeletonBlock height={56} />
      </Skeleton>
      <EmptyState
        icon={CalendarDays}
        eyebrow={gallery.empty.eyebrow}
        title={gallery.empty.title}
        body={gallery.empty.body}
        action={<Button icon={Plus}>{gallery.button}</Button>}
        xstyle={styles.tile}
      />
      <EmptyState
        icon={CalendarDays}
        title={gallery.empty.title}
        body={gallery.empty.body}
        size="lg"
        align="center"
      />
      <SourceFailure
        icon={CloudOff}
        eyebrow={gallery.failure.eyebrow}
        title={gallery.failure.title}
        body={gallery.failure.body}
        retryLabel={gallery.failure.retry}
        onRetry={ignore}
        xstyle={styles.tile}
      />
      <OfflinePill label={gallery.offline.label} meta={gallery.offline.meta} />
      <div {...stylex.props(styles.wide)}>
        <SettingsRow title={gallery.settings.clock} description={gallery.settings.clockBody}>
          <PillTabs options={["12h", "24h"] as const} value="12h" onChange={ignore} />
        </SettingsRow>
        <SettingsRow
          title={gallery.settings.background}
          description={gallery.settings.backgroundBody}
          onClick={ignore}
          divider
        />
        <SettingsRow
          title={copy.settings.hideSidebar.title}
          description={copy.settings.hideSidebar.body}
          checked
          onCheckedChange={ignore}
          divider={false}
        />
      </div>
      <Button variant="secondary" onClick={() => setSheetOpen(true)}>
        {gallery.sheet.open}
      </Button>
      {sheetOpen && (
        <Sheet
          title={gallery.sheet.title}
          eyebrow={gallery.sheet.eyebrow}
          closeLabel={gallery.sheet.close}
          onClose={closeSheet}
          startActions={
            <Button variant="ghost" onClick={closeSheet}>
              {gallery.sheet.cancel}
            </Button>
          }
          endActions={<Button onClick={closeSheet}>{gallery.sheet.save}</Button>}
        >
          <TimeEntryDemo />
        </Sheet>
      )}
    </GalleryGroup>
  );
}

function ZoneGroup() {
  const loading = (
    <Skeleton label={gallery.skeleton}>
      <SkeletonBlock height={56} />
    </Skeleton>
  );

  const empty = (
    <EmptyState icon={CalendarDays} title={gallery.empty.title} body={gallery.empty.body} />
  );

  const failed = (
    <SourceFailure
      icon={CloudOff}
      title={gallery.failure.title}
      body={gallery.failure.body}
      retryLabel={gallery.failure.retry}
      onRetry={ignore}
    />
  );

  return (
    <GalleryGroup title={gallery.groups.zone}>
      {ZONE_STATES.map((state) => (
        <div key={state.kind} {...stylex.props(styles.zone)}>
          <Zone state={state} loading={loading} empty={empty} failed={failed}>
            {(data, updatedAt) => (
              <>
                <Eyebrow size="caption">{`${gallery.zone.ready} · ${updatedAt}`}</Eyebrow>
                {data.map((title) => (
                  <span key={title}>{title}</span>
                ))}
              </>
            )}
          </Zone>
        </div>
      ))}
    </GalleryGroup>
  );
}
