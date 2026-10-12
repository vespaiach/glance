import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import type { Season } from "@/domain/schemas";
import { SignInView } from "@/features/signin";
import { GalleryGroup } from "./GalleryGroup";
import { gallery, NOW } from "./samples";

type SignInProps = ComponentProps<typeof SignInView>;

type Demo = { key: string; phone?: boolean } & Partial<SignInProps>;

const ignore = () => {};

const EMAIL = "maria@example.com";

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
  { key: "offline", state: { step: "form", email: EMAIL }, online: false },
  { key: "sent", state: { step: "sent", email: EMAIL } },
  { key: "name", state: { step: "name", email: EMAIL, draft: "" } },
  { key: "name-empty", state: { step: "name", email: EMAIL, draft: "", error: "empty" } },
  { key: "phone-wait", state: { step: "phone", email: EMAIL } },
  { key: "expired", state: { step: "expired", email: EMAIL, onLink: false } },
  { key: "link-expired", state: { step: "expired", email: EMAIL, onLink: true } },
  { key: "done", state: { step: "done", name: "Maria", returning: false } },
  { key: "done-returning", state: { step: "done", name: "Maria", returning: true } },
  { key: "phone", phone: true, breakpoint: "phone" },
];

function signInBase(season: Season): SignInProps {
  return {
    state: { step: "form", email: "" },
    season,
    time: NOW,
    clock: "12h",
    breakpoint: "wide",
    online: true,
    demo: true,
    onAction: ignore,
    onDemo: ignore,
    onOpenedLink: ignore,
    onFinishedOnPhone: ignore,
  };
}

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
