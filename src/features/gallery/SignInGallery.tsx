import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import type { Season } from "@/domain/schemas";
import { SignInView } from "@/features/signin";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_TZ, gallery, gallerySetup, NOW, PLACES } from "./samples";

type SignInProps = ComponentProps<typeof SignInView>;

type Demo = { key: string; phone?: boolean } & Partial<SignInProps>;

const ignore = () => {};

const EMAIL = "maria@example.com";

const MARIA = { id: "0192f3a0-0000-7000-8000-000000000001", email: EMAIL, name: "Maria" };

const OTHER_EMAIL = "sam.lee@example.com";

const SIGNED_OUT = { email: EMAIL, pending: 0 };

const WAITING = { email: EMAIL, pending: 3 };

const ENDED = { step: "form", email: EMAIL } as const;

const LOCATION = { step: "location", account: MARIA, returning: false } as const;

const [PORTLAND] = PLACES;

const CODE = { step: "sent", email: EMAIL, sentAt: secondsBefore(10), code: "" } as const;

const styles = stylex.create({
  view: {
    width: 1280,
    height: 720,
  },
  phone: {
    width: 390,
    height: 1100,
  },
});

const DEMOS: readonly Demo[] = [
  { key: "form" },
  { key: "invalid", state: { step: "form", email: "maria@example", error: "invalid" } },
  { key: "sending", state: { step: "sending", email: EMAIL } },
  { key: "sendfail", state: { step: "form", email: EMAIL, error: "failed" } },
  { key: "offline", state: { step: "form", email: EMAIL }, online: false },
  { key: "guest", guest: true },
  { key: "guest-signing-in", guest: true, state: { step: "guest", email: "" } },
  { key: "guest-failed", guest: true, state: { step: "form", email: "", error: "guest" } },
  { key: "guest-sending", guest: true, state: { step: "sending", email: EMAIL } },
  { key: "guest-offline", guest: true, online: false },
  { key: "guest-phone", guest: true, phone: true, breakpoint: "phone" },
  { key: "code", state: { ...CODE, sentAt: secondsBefore(2) } },
  { key: "code-typed", state: { ...CODE, code: "482" } },
  { key: "code-checking", state: { ...CODE, step: "checking", code: "482913" } },
  { key: "code-wrong", state: { ...CODE, wrong: true } },
  { key: "code-locked", state: { step: "locked", email: EMAIL, sentAt: secondsBefore(2) } },
  { key: "code-offline", state: { ...CODE, code: "482913" }, online: false },
  { key: "code-phone", phone: true, breakpoint: "phone", state: { ...CODE, code: "482" } },
  { key: "name", state: { step: "name", email: EMAIL, draft: "" } },
  { key: "name-empty", state: { step: "name", email: EMAIL, draft: "", error: "empty" } },
  { key: "location", state: LOCATION },
  {
    key: "location-locating",
    state: LOCATION,
    setup: gallerySetup({ step: "locating", draft: "" }),
  },
  {
    key: "location-choose",
    state: LOCATION,
    setup: gallerySetup({ step: "choosing", draft: "Portland", matches: PLACES }),
  },
  {
    key: "location-denied",
    state: LOCATION,
    setup: gallerySetup({ step: "editing", draft: "", notice: "denied" }, false),
  },
  {
    key: "location-savefail",
    state: LOCATION,
    setup: gallerySetup({
      step: "editing",
      draft: "Portland, OR",
      error: "save-failed",
      ...(PORTLAND && { place: PORTLAND }),
    }),
  },
  { key: "location-phone", phone: true, breakpoint: "phone", state: LOCATION },
  { key: "expired", state: { step: "expired", email: EMAIL } },
  { key: "done", state: { step: "done", name: "Maria", returning: false } },
  { key: "done-returning", state: { step: "done", name: "Maria", returning: true } },
  { key: "phone", phone: true, breakpoint: "phone" },
  { key: "ended", state: ENDED, signedOut: SIGNED_OUT },
  { key: "ended-pending", state: ENDED, signedOut: WAITING },
  { key: "ended-switch", state: { step: "form", email: OTHER_EMAIL }, signedOut: WAITING },
  { key: "ended-sending", state: { step: "sending", email: EMAIL }, signedOut: WAITING },
  {
    key: "ended-switch-phone",
    phone: true,
    breakpoint: "phone",
    state: { step: "form", email: OTHER_EMAIL },
    signedOut: WAITING,
  },
];

export function SignInGallery({ season }: { season: Season }) {
  return (
    <GalleryGroup title={gallery.groups.signInView}>
      {DEMOS.map(({ key, phone, ...demo }) => (
        <SignInView
          key={key}
          {...signInBase(season)}
          {...demo}
          xstyle={phone ? styles.phone : styles.view}
        />
      ))}
    </GalleryGroup>
  );
}

function signInBase(season: Season): SignInProps {
  return {
    state: { step: "form", email: "" },
    setup: gallerySetup({ step: "editing", draft: "" }),
    season,
    time: NOW,
    clock: "12h",
    tz: GALLERY_TZ,
    breakpoint: "wide",
    online: true,
    onAction: ignore,
  };
}

function secondsBefore(seconds: number): Date {
  return new Date(NOW.getTime() - seconds * 1_000);
}
