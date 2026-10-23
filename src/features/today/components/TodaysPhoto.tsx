"use client";

import * as stylex from "@stylexjs/stylex";
import { ArrowRight, Image, ImageOff, ImagePlus, Smartphone, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import type { ZoneState } from "@/domain/zoneState";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { press } from "@/ui/press";
import { QrCode } from "@/ui/QrCode";
import { Skeleton } from "@/ui/Skeleton";
import { useBoxSize } from "@/ui/useBoxSize";
import { Zone } from "@/ui/Zone";
import type { FirstUpload, PhotoText } from "../todaysPhoto";

export type PhotoThumb = { id: string; src: string };

export type ShownPhoto = {
  photo: Photo;
  src: string;
  text: PhotoText;
  others: readonly PhotoThumb[];
};

export type QrShown = { url?: string };

type TodaysPhotoProps = {
  state: ZoneState<ShownPhoto>;
  upload?: FirstUpload;
  qr?: QrShown;
  online: boolean;
  fromPhone: boolean;
  moments: string;
  defaultFailed?: boolean;
  frame?: stylex.StyleXStyles;
  onAdd: () => void;
  onChooseFiles: () => void;
  onCloseQr: () => void;
  onOpen: (id: string) => void;
  onOpenPhotos: () => void;
  xstyle?: stylex.StyleXStyles;
};

type ActionsProps = {
  narrow: boolean;
  all: boolean;
  onAdd: () => void;
  onOpenPhotos: () => void;
};

type PhotoBodyProps = {
  shown: ShownPhoto;
  narrow: boolean;
  online: boolean;
  defaultFailed: boolean;
  frame?: stylex.StyleXStyles;
  onOpen: (id: string) => void;
  onOpenPhotos: () => void;
};

type FrameImageProps = { src: string; onError: () => void };

type MoreRowProps = { others: readonly PhotoThumb[]; onOpenPhotos: () => void };

type FirstUploadProps = {
  upload: FirstUpload;
  frame?: stylex.StyleXStyles;
  onOpenPhotos: () => void;
};

type NoPhotosProps = { fromPhone: boolean; moments: string; onAdd: () => void };

type QrPanelProps = { qr: QrShown; onChooseFiles: () => void; onCloseQr: () => void };

const text = copy.today.photo;

const NARROW_BOX = 440;

const MAX_THUMBS = 3;

const MIN_BAR_PERCENT = 2;

const PORTRAIT_POSITION = "50% 30%";

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  panel: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: space.md,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.xs,
    minHeight: 44,
    paddingInlineStart: space.xs,
  },
  actions: {
    display: "flex",
    gap: space.xxs,
  },
  iconButton: {
    width: 44,
    height: 44,
  },
  tap: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  photo: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    minWidth: 0,
  },
  frame: {
    position: "relative",
    display: "block",
    width: "100%",
    aspectRatio: "4 / 3",
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
  },
  image: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    animationName: fadeIn,
    animationDuration: motion.durSeason,
    animationTimingFunction: motion.easeOut,
  },
  portrait: {
    objectPosition: PORTRAIT_POSITION,
  },
  faded: {
    opacity: 0.6,
    animationName: "none",
  },
  broken: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    padding: space.md,
    boxSizing: "border-box",
    textAlign: "center",
  },
  words: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    paddingInline: space.xs,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 480,
    lineHeight: 1.25,
  },
  oneLine: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  twoLines: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  mono: {
    fontFamily: type.fontMono,
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: "0.54px",
    lineHeight: 1.3,
    textTransform: "uppercase",
  },
  caption: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  numbers: {
    fontVariantNumeric: "tabular-nums",
  },
  moreWrap: {
    paddingInline: space.xs,
  },
  more: {
    width: "100%",
    minHeight: 52,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairline,
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingTop: space.xxs,
    paddingBottom: 0,
    paddingInline: 0,
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    font: "inherit",
    color: "inherit",
    textAlign: "start",
    cursor: "pointer",
  },
  thumbs: {
    display: "flex",
    flexShrink: 0,
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    objectFit: "cover",
    display: "block",
    backgroundColor: colors.surfaceSoft,
    boxShadow: `0 0 0 2px ${colors.surfaceCanvas}`,
    marginInlineStart: { default: -8, ":first-child": 0 },
  },
  moreLabel: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: 480,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  loadingFrame: {
    width: "100%",
    aspectRatio: "4 / 3",
    borderRadius: radii.md,
    backgroundColor: season.soft,
  },
  bars: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    paddingInline: space.xs,
  },
  bar: {
    backgroundColor: colors.black,
    opacity: 0.08,
  },
  titleBar: { width: "55%", height: 18, borderRadius: 4 },
  captionBar: { width: "35%", height: 12, borderRadius: 3 },
  track: {
    position: "absolute",
    left: space.sm,
    right: space.sm,
    bottom: space.sm,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    overflow: "hidden",
  },
  fill: {
    display: "block",
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.actionPrimary,
    transitionProperty: "width",
    transitionDuration: "300ms",
    transitionTimingFunction: "linear",
  },
  fillWidth: (percent: number) => ({ width: `${percent}%` }),
  tile: {
    width: "100%",
    aspectRatio: "8 / 7",
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: season.soft,
    padding: space.lg,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 20,
  },
  stack: {
    position: "relative",
    flexShrink: 0,
    width: 104,
    height: 80,
    marginTop: space.xxs,
    marginInlineStart: space.xs,
  },
  sheet: {
    position: "absolute",
    inset: 0,
    borderRadius: radii.sm,
  },
  back: {
    backgroundColor: season.block4,
    transform: "rotate(8deg) translate(8px, 2px)",
  },
  middle: {
    backgroundColor: season.block3,
    transform: "rotate(-6deg) translate(-6px, 2px)",
  },
  front: {
    backgroundColor: colors.surfaceCanvas,
    boxShadow: shadows.shadow2,
    transform: "rotate(-1.5deg)",
    padding: 6,
    boxSizing: "border-box",
    display: "flex",
  },
  print: {
    flexGrow: 1,
    borderRadius: 3,
    backgroundColor: season.block1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tileWords: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
  },
  tileTitle: {
    fontSize: 22,
    fontWeight: 340,
    letterSpacing: "-0.3px",
    lineHeight: 1.2,
  },
  tileBody: {
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.xs,
    height: 44,
    paddingInlineStart: space.md,
    paddingInlineEnd: 20,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
    fontSize: 17,
    fontWeight: 480,
  },
  qr: {
    width: "100%",
    aspectRatio: "8 / 7",
    backgroundColor: season.block1,
    borderRadius: radii.md,
    padding: 20,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 20,
  },
  qrRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 20,
  },
  qrWords: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 0,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 540,
    letterSpacing: "-0.2px",
  },
  qrBody: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  qrActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.xs,
  },
});

export function TodaysPhoto({
  state,
  upload,
  qr,
  online,
  fromPhone,
  moments,
  defaultFailed = false,
  frame,
  onAdd,
  onChooseFiles,
  onCloseQr,
  onOpen,
  onOpenPhotos,
  xstyle,
}: TodaysPhotoProps) {
  const ref = useRef<HTMLElement>(null);

  const narrow = (useBoxSize(ref)?.width ?? Number.POSITIVE_INFINITY) < NARROW_BOX;

  const shown = state.kind === "ready" && qr === undefined ? state.data[0] : undefined;

  return (
    <section ref={ref} {...stylex.props(styles.panel, xstyle)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{text.eyebrow}</Eyebrow>
        {shown && (
          <Actions
            narrow={narrow}
            all={shown.others.length === 0}
            onAdd={onAdd}
            onOpenPhotos={onOpenPhotos}
          />
        )}
      </div>
      {qr ? (
        <QrPanel qr={qr} onChooseFiles={onChooseFiles} onCloseQr={onCloseQr} />
      ) : (
        <Zone
          state={state}
          loading={<Loading frame={frame} />}
          empty={
            upload ? (
              <FirstUploadButton upload={upload} frame={frame} onOpenPhotos={onOpenPhotos} />
            ) : (
              <NoPhotos fromPhone={fromPhone} moments={moments} onAdd={onAdd} />
            )
          }
          failed={null}
        >
          {([first]) =>
            first && (
              <PhotoBody
                shown={first}
                narrow={narrow}
                online={online}
                defaultFailed={defaultFailed}
                frame={frame}
                onOpen={onOpen}
                onOpenPhotos={onOpenPhotos}
              />
            )
          }
        </Zone>
      )}
    </section>
  );
}

function Actions({ narrow, all, onAdd, onOpenPhotos }: ActionsProps) {
  if (narrow) {
    return (
      <div {...stylex.props(styles.actions)}>
        <IconButton
          icon={ImagePlus}
          label={text.addPhoto}
          variant="canvas"
          onClick={onAdd}
          xstyle={styles.iconButton}
        />
        {all && (
          <IconButton
            icon={ArrowRight}
            label={text.allPhotos}
            variant="canvas"
            onClick={onOpenPhotos}
            xstyle={styles.iconButton}
          />
        )}
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.actions)}>
      <Button variant="ghost" icon={ImagePlus} onClick={onAdd}>
        {text.addPhoto}
      </Button>
      {all && (
        <Button variant="ghost" iconRight={ArrowRight} onClick={onOpenPhotos}>
          {text.allPhotos}
        </Button>
      )}
    </div>
  );
}

function PhotoBody({
  shown,
  narrow,
  online,
  defaultFailed,
  frame,
  onOpen,
  onOpenPhotos,
}: PhotoBodyProps) {
  const attempt = `${shown.src} ${online}`;

  const [failedAttempt, setFailedAttempt] = useState(defaultFailed ? attempt : undefined);

  const failed = failedAttempt === attempt;

  return (
    <>
      <button
        type="button"
        aria-label={shown.text.name}
        onClick={() => onOpen(shown.photo.id)}
        {...stylex.props(styles.tap, styles.photo, press.scale)}
      >
        <span {...stylex.props(styles.frame, frame)}>
          {failed ? (
            <span {...stylex.props(styles.broken)}>
              <Icon icon={ImageOff} size={32} strokeWidth={1.5} />
              <span {...stylex.props(styles.mono)}>{online ? text.failed : text.offline}</span>
            </span>
          ) : (
            <FrameImage
              key={shown.photo.id}
              src={shown.src}
              onError={() => setFailedAttempt(attempt)}
            />
          )}
        </span>
        <span {...stylex.props(styles.words)}>
          <span {...stylex.props(styles.title, narrow ? styles.twoLines : styles.oneLine)}>
            {shown.text.title}
          </span>
          {shown.text.caption && (
            <span {...stylex.props(styles.mono, styles.caption)}>{shown.text.caption}</span>
          )}
        </span>
      </button>
      {shown.others.length > 0 && <MoreRow others={shown.others} onOpenPhotos={onOpenPhotos} />}
    </>
  );
}

function FrameImage({ src, onError }: FrameImageProps) {
  const [portraitSrc, setPortraitSrc] = useState<string>();

  const measure = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.naturalWidth > 0)
        setPortraitSrc(isPortrait(image) ? src : undefined);
    },
    [src],
  );

  return (
    // biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer
    <img
      src={src}
      alt=""
      ref={measure}
      onLoad={(event) => measure(event.currentTarget)}
      onError={onError}
      {...stylex.props(styles.image, portraitSrc === src && styles.portrait)}
    />
  );
}

function MoreRow({ others, onOpenPhotos }: MoreRowProps) {
  const label = text.more(others.length);

  return (
    <div {...stylex.props(styles.moreWrap)}>
      <button
        type="button"
        aria-label={text.moreName(label)}
        onClick={onOpenPhotos}
        {...stylex.props(styles.more, press.scale)}
      >
        <span aria-hidden="true" {...stylex.props(styles.thumbs)}>
          {others.slice(0, MAX_THUMBS).map((thumb) => (
            // biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer
            <img key={thumb.id} src={thumb.src} alt="" {...stylex.props(styles.thumb)} />
          ))}
        </span>
        <span {...stylex.props(styles.moreLabel)}>{label}</span>
        <Icon icon={ArrowRight} size={20} />
      </button>
    </div>
  );
}

function Loading({ frame }: { frame?: stylex.StyleXStyles }) {
  return (
    <Skeleton label={text.loading} xstyle={styles.loading}>
      <div {...stylex.props(styles.loadingFrame, frame)} />
      <div {...stylex.props(styles.bars)}>
        <div {...stylex.props(styles.bar, styles.titleBar)} />
        <div {...stylex.props(styles.bar, styles.captionBar)} />
      </div>
    </Skeleton>
  );
}

function FirstUploadButton({ upload, frame, onOpenPhotos }: FirstUploadProps) {
  const name = text.upload.name(upload.percent);

  return (
    <button
      type="button"
      aria-label={name}
      onClick={onOpenPhotos}
      {...stylex.props(styles.tap, styles.photo, press.scale)}
    >
      <span {...stylex.props(styles.frame, frame)}>
        {upload.preview && (
          // biome-ignore lint/performance/noImgElement: the preview is a local object URL of the file being uploaded
          <img src={upload.preview} alt="" {...stylex.props(styles.image, styles.faded)} />
        )}
        <span
          role="progressbar"
          aria-label={name}
          aria-valuenow={upload.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          {...stylex.props(styles.track)}
        >
          <span
            {...stylex.props(
              styles.fill,
              styles.fillWidth(Math.max(upload.percent, MIN_BAR_PERCENT)),
            )}
          />
        </span>
      </span>
      <span {...stylex.props(styles.words)}>
        <span {...stylex.props(styles.title)}>{text.upload.title}</span>
        <span {...stylex.props(styles.mono, styles.numbers)}>{upload.status}</span>
      </span>
    </button>
  );
}

function NoPhotos({ fromPhone, moments, onAdd }: NoPhotosProps) {
  return (
    <button
      type="button"
      aria-label={fromPhone ? text.empty.fromPhoneName : text.empty.addPhotos}
      onClick={onAdd}
      {...stylex.props(styles.tap, styles.tile, press.scale)}
    >
      <span aria-hidden="true" {...stylex.props(styles.stack)}>
        <span {...stylex.props(styles.sheet, styles.back)} />
        <span {...stylex.props(styles.sheet, styles.middle)} />
        <span {...stylex.props(styles.sheet, styles.front)}>
          <span {...stylex.props(styles.print)}>
            <Icon icon={Image} size={28} strokeWidth={1.5} />
          </span>
        </span>
      </span>
      <span {...stylex.props(styles.tileWords)}>
        <span {...stylex.props(styles.tileTitle)}>{text.empty.title}</span>
        <span {...stylex.props(styles.tileBody)}>{moments}</span>
      </span>
      <span {...stylex.props(styles.pill)}>
        <Icon icon={fromPhone ? Smartphone : Upload} size={18} />
        {fromPhone ? text.empty.fromPhone : text.empty.addPhotos}
      </span>
    </button>
  );
}

function QrPanel({ qr, onChooseFiles, onCloseQr }: QrPanelProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset can't center its content as a flex column
    <div role="group" aria-label={text.qr.name} {...stylex.props(styles.qr)}>
      <div {...stylex.props(styles.qrRow)}>
        <QrCode value={qr.url} label={text.qr.code} />
        <div {...stylex.props(styles.qrWords)}>
          <span {...stylex.props(styles.qrTitle)}>{text.qr.title}</span>
          <span {...stylex.props(styles.qrBody)}>{text.qr.body}</span>
        </div>
      </div>
      <div {...stylex.props(styles.qrActions)}>
        <Button variant="secondary" icon={Upload} onClick={onChooseFiles}>
          {text.qr.chooseFiles}
        </Button>
        <Button variant="ghost" icon={X} onClick={onCloseQr}>
          {text.qr.done}
        </Button>
      </div>
    </div>
  );
}

function isPortrait(image: HTMLImageElement): boolean {
  return image.naturalHeight > image.naturalWidth;
}
