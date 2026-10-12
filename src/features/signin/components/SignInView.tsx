"use client";

import * as stylex from "@stylexjs/stylex";
import {
  ArrowRight,
  ChevronLeft,
  CircleCheck,
  Mail,
  RotateCw,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { type FormEvent, useRef } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Season } from "@/domain/schemas";
import { firstName } from "@/domain/signIn";
import type { Clock as ClockSetting } from "@/domain/time";
import { PlaceForm, type WeatherSetupFlow } from "@/features/weather";
import { colors, motion, sizes, space } from "@/theme/tokens.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { useFieldInView } from "@/ui/fieldInView";
import { Icon } from "@/ui/Icon";
import { TextInput } from "@/ui/TextInput";
import { signInLayout } from "../layout";
import type { SignInAction, SignInState } from "../signIn";
import { SignInHero } from "./SignInHero";
import { Actions, Email, Heading, LockFooter, StatusTile } from "./SignInParts";

type SignInViewProps = {
  state: SignInState;
  setup: WeatherSetupFlow;
  season: Season;
  time: Date;
  clock: ClockSetting;
  tz: string;
  breakpoint: Breakpoint;
  online: boolean;
  demo: boolean;
  onAction: (action: SignInAction) => void;
  onDemo: () => void;
  onOpenedLink: () => void;
  onFinishedOnPhone: () => void;
  keyboardInset?: number;
  xstyle?: stylex.StyleXStyles;
};

type StepProps = Omit<
  SignInViewProps,
  "season" | "time" | "clock" | "tz" | "breakpoint" | "keyboardInset" | "xstyle"
>;

const styles = stylex.create({
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    transitionProperty: "padding-bottom",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  },
  aboveKeyboard: (inset: number) => ({ paddingBottom: inset }),
  main: {
    flexGrow: 1,
    minHeight: 0,
    overflow: "auto",
    boxSizing: "border-box",
    padding: sizes.kioskGutter,
    display: "grid",
    gap: 24,
    alignContent: "start",
  },
  heroTall: { minHeight: "100%" },
  panel: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 32,
    padding: "clamp(8px, 3vw, 48px)",
    boxSizing: "border-box",
    minWidth: 0,
    maxWidth: 560,
    width: "100%",
    justifySelf: "center",
  },
  form: {
    display: "contents",
  },
  place: {
    padding: 0,
  },
  skip: {
    display: "flex",
    paddingTop: space.lg,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
});

function FormStep({ state, online, demo, onAction, onDemo }: StepProps) {
  const sending = state.step === "sending";

  const email = state.step === "form" || sending ? state.email : "";

  const error = state.step === "form" && state.error ? copy.signIn.form[state.error] : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (online && !sending) onAction({ type: "send" });
  };

  return (
    <>
      <Heading eyebrow={copy.signIn.form.eyebrow} title={copy.signIn.form.title}>
        {copy.signIn.form.body}
      </Heading>
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        <TextInput
          label={copy.signIn.form.label}
          placeholder={copy.signIn.form.placeholder}
          value={email}
          onChange={(value) => onAction({ type: "email", email: value })}
          error={error}
        />
        {!online && (
          <Banner
            tone="soft"
            icon={WifiOff}
            title={copy.signIn.form.offlineTitle}
            body={copy.signIn.form.offlineBody}
          />
        )}
        <Actions>
          <Button
            type="submit"
            iconRight={sending ? undefined : ArrowRight}
            disabled={!online || sending}
          >
            {sending ? copy.signIn.form.sending : copy.signIn.form.send}
          </Button>
          {demo && !sending && (
            <Button variant="ghost" onClick={onDemo}>
              {copy.signIn.form.demo}
            </Button>
          )}
        </Actions>
      </form>
      {sending && (
        <StatusTile icon={Mail} pulsing>
          <Email before={copy.signIn.form.sendingTo} email={email} after="" />
        </StatusTile>
      )}
      <LockFooter />
    </>
  );
}

function BackButton({ onAction }: Pick<StepProps, "onAction">) {
  return (
    <Button variant="ghost" icon={ChevronLeft} onClick={() => onAction({ type: "back" })}>
      {copy.signIn.differentEmail}
    </Button>
  );
}

function ResendButton({ onAction }: Pick<StepProps, "onAction">) {
  return (
    <Button icon={RotateCw} onClick={() => onAction({ type: "send" })}>
      {copy.signIn.resend}
    </Button>
  );
}

function SentStep({ email, demo, onAction, onOpenedLink }: StepProps & { email: string }) {
  const { sent } = copy.signIn;

  return (
    <>
      <Heading eyebrow={copy.signIn.eyebrow} title={sent.title}>
        <Email before={sent.before} email={email} after={sent.after} />
      </Heading>
      <StatusTile icon={Mail}>{sent.expires}</StatusTile>
      <Actions>
        {demo && <Button onClick={onOpenedLink}>{sent.opened}</Button>}
        <BackButton onAction={onAction} />
      </Actions>
    </>
  );
}

function NameStep({
  state,
  onAction,
}: StepProps & { state: Extract<SignInState, { step: "name" }> }) {
  const { name } = copy.signIn;

  const submit = (event: FormEvent) => {
    event.preventDefault();

    onAction({ type: "submit-name" });
  };

  return (
    <>
      <Heading eyebrow={name.eyebrow} title={name.title}>
        <Email before={name.before} email={state.email} after={name.after} />
      </Heading>
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        <TextInput
          label={name.label}
          placeholder={name.placeholder}
          value={state.draft}
          onChange={(draft) => onAction({ type: "name", draft })}
          error={state.error && name[state.error]}
        />
        <Actions>
          <Button type="submit" iconRight={ArrowRight} disabled={state.saving}>
            {name.submit}
          </Button>
        </Actions>
      </form>
    </>
  );
}

function LocationStep({
  state,
  setup,
  onAction,
}: StepProps & { state: Extract<SignInState, { step: "location" }> }) {
  const { location } = copy.signIn;

  return (
    <>
      <Heading eyebrow={location.eyebrow} title={location.title}>
        {location.body}
      </Heading>
      <PlaceForm
        state={setup.state}
        canLocate={setup.canLocate}
        submitLabel={location.submit}
        onType={setup.type}
        onSubmit={setup.submit}
        onPick={setup.pick}
        onLocate={setup.locate}
        xstyle={styles.place}
      />
      <div {...stylex.props(styles.skip)}>
        <Button
          variant="ghost"
          disabled={state.skipping}
          onClick={() => onAction({ type: "skip" })}
        >
          {location.skip}
        </Button>
      </div>
    </>
  );
}

function PhoneStep({ demo, onAction, onFinishedOnPhone }: StepProps) {
  const { phone } = copy.signIn;

  return (
    <>
      <Heading eyebrow={copy.signIn.eyebrow} title={phone.title}>
        {phone.body}
      </Heading>
      <StatusTile icon={Smartphone} pulsing>
        {phone.waiting}
      </StatusTile>
      <Actions>
        {demo && <Button onClick={onFinishedOnPhone}>{phone.finished}</Button>}
        <BackButton onAction={onAction} />
      </Actions>
    </>
  );
}

function ExpiredStep({
  state,
  onAction,
}: StepProps & { state: Extract<SignInState, { step: "expired" }> }) {
  const text = state.onLink ? copy.signIn.linkExpired : copy.signIn.expired;

  const eyebrow = state.onLink ? copy.signIn.linkExpired.eyebrow : copy.signIn.eyebrow;

  return (
    <>
      <Heading eyebrow={eyebrow} title={text.title}>
        <Email before={text.before} email={state.email} after={text.after} />
      </Heading>
      <Actions>
        <ResendButton onAction={onAction} />
        {!state.onLink && <BackButton onAction={onAction} />}
      </Actions>
    </>
  );
}

function DoneStep({ state }: { state: Extract<SignInState, { step: "done" }> }) {
  const { done } = copy.signIn;

  const welcome = state.returning ? done.welcomeBack : done.welcome;

  return (
    <>
      <Icon icon={CircleCheck} size={56} strokeWidth={1.25} />
      <Heading eyebrow={done.eyebrow} title={welcome(firstName(state.name))}>
        {done.body}
      </Heading>
    </>
  );
}

function SignInStep(props: StepProps) {
  const { state } = props;

  switch (state.step) {
    case "opening":
      return null;
    case "form":
    case "sending":
      return <FormStep {...props} />;
    case "sent":
      return <SentStep {...props} email={state.email} />;
    case "name":
      return <NameStep {...props} state={state} />;
    case "location":
      return <LocationStep {...props} state={state} />;
    case "phone":
      return <PhoneStep {...props} />;
    case "expired":
      return <ExpiredStep {...props} state={state} />;
    case "done":
      return <DoneStep state={state} />;
  }
}

export function SignInView({
  season,
  time,
  clock,
  tz,
  breakpoint,
  keyboardInset = 0,
  xstyle,
  ...step
}: SignInViewProps) {
  const tall = breakpoint === "wide" || breakpoint === "mid";

  const main = useRef<HTMLElement>(null);

  useFieldInView(main, keyboardInset);

  return (
    <div {...stylex.props(styles.root, styles.aboveKeyboard(keyboardInset), xstyle)}>
      <main ref={main} {...stylex.props(styles.main, signInLayout(breakpoint))}>
        <SignInHero
          season={season}
          time={time}
          clock={clock}
          tz={tz}
          xstyle={tall && styles.heroTall}
        />
        <div {...stylex.props(styles.panel)}>
          <SignInStep {...step} />
        </div>
      </main>
    </div>
  );
}
