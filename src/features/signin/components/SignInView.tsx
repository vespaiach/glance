"use client";

import * as stylex from "@stylexjs/stylex";
import {
  ArrowRight,
  ChevronLeft,
  CircleCheck,
  Info,
  LogOut,
  Mail,
  RotateCw,
  Smartphone,
  Undo2,
  UserRound,
  WifiOff,
} from "lucide-react";
import { type FormEvent, type Ref, useRef } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Season } from "@/domain/schemas";
import { differentEmailIn, firstName, isSwitchingEmail } from "@/domain/signIn";
import type { Clock as ClockSetting } from "@/domain/time";
import { PlaceForm, type WeatherSetupFlow } from "@/features/weather";
import { colors, motion, sizes, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { useFieldInView } from "@/ui/fieldInView";
import { Icon } from "@/ui/Icon";
import { TextInput } from "@/ui/TextInput";
import { signInLayout } from "../layout";
import type { SignInAction, SignInState } from "../signIn";
import { SignInHero } from "./SignInHero";
import { Actions, Email, Heading, LockFooter, StatusTile, SwitchTile } from "./SignInParts";

type SignedOut = { email: string; pending: number };

type SignInViewProps = {
  state: SignInState;
  signedOut?: SignedOut;
  setup: WeatherSetupFlow;
  season: Season;
  time: Date;
  clock: ClockSetting;
  tz: string;
  breakpoint: Breakpoint;
  online: boolean;
  demo: boolean;
  guest?: boolean;
  onAction: (action: SignInAction) => void;
  onFinishedOnPhone: () => void;
  keyboardInset?: number;
  rootRef?: Ref<HTMLDivElement>;
  xstyle?: stylex.StyleXStyles;
};

type StepProps = Omit<
  SignInViewProps,
  "season" | "time" | "clock" | "tz" | "breakpoint" | "keyboardInset" | "rootRef" | "xstyle"
>;

const styles = stylex.create({
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    backgroundColor: colors.hairlineSoft,
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
  backTimer: {
    display: "flex",
    alignItems: "center",
    minHeight: 44,
    paddingInline: 12,
    fontFamily: type.fontMono,
    fontSize: 14,
    fontWeight: 400,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  failure: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    color: colors.danger,
  },
});

export function SignInView({
  season,
  time,
  clock,
  tz,
  breakpoint,
  keyboardInset = 0,
  rootRef,
  xstyle,
  ...step
}: SignInViewProps) {
  const tall = breakpoint === "wide" || breakpoint === "mid";

  const main = useRef<HTMLElement>(null);

  useFieldInView(main, keyboardInset);

  return (
    <div ref={rootRef} {...stylex.props(styles.root, styles.aboveKeyboard(keyboardInset), xstyle)}>
      <main ref={main} {...stylex.props(styles.main, signInLayout(breakpoint))}>
        <SignInHero
          season={season}
          time={time}
          clock={clock}
          tz={tz}
          xstyle={tall && styles.heroTall}
        />
        <div {...stylex.props(styles.panel)}>
          <SignInStep {...step} time={time} />
        </div>
      </main>
    </div>
  );
}

function endedNotice({ pending }: SignedOut, switching: boolean): string {
  const { ended } = copy.signIn;

  if (pending === 0) return ended.noticeBody;

  const waiting = `${ended.noticeBody} ${ended.waiting(pending)}`;

  return switching ? waiting : `${waiting} ${ended.sentAfter}`;
}

function FormHeading({ signedOut }: { signedOut?: SignedOut }) {
  const { form, ended } = copy.signIn;

  return (
    <Heading eyebrow={form.eyebrow} title={signedOut ? ended.title : form.title}>
      {signedOut ? ended.body : form.body}
    </Heading>
  );
}

function EndedBanner({ signedOut, switching }: { signedOut: SignedOut; switching: boolean }) {
  return (
    <div role="status">
      <Banner
        tone="soft"
        icon={LogOut}
        title={copy.signIn.ended.notice}
        body={endedNotice(signedOut, switching)}
      />
    </div>
  );
}

function FormStep({ state, signedOut, online, guest, onAction }: StepProps) {
  const sending = state.step === "sending";

  const busy = sending || state.step === "guest";

  const email = state.step === "form" || busy ? state.email : "";

  const error = state.step === "form" ? fieldError(state.error) : undefined;

  const switching =
    signedOut !== undefined && isSwitchingEmail(signedOut.email, email, signedOut.pending);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (online && !busy) onAction({ type: "send" });
  };

  return (
    <>
      {signedOut && <EndedBanner signedOut={signedOut} switching={switching} />}
      <FormHeading signedOut={signedOut} />
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        <TextInput
          label={copy.signIn.form.label}
          placeholder={copy.signIn.form.placeholder}
          value={email}
          onChange={(value) => onAction({ type: "email", email: value })}
          error={error}
        />
        {signedOut && switching && (
          <SwitchTile
            icon={Info}
            action={
              <Button
                variant="ghost"
                icon={Undo2}
                onClick={() => onAction({ type: "email", email: signedOut.email })}
              >
                {copy.signIn.ended.previousEmail(signedOut.email)}
              </Button>
            }
          >
            <Email
              before={copy.signIn.ended.switchBefore}
              email={signedOut.email}
              after={copy.signIn.ended.switchAfter}
            />
          </SwitchTile>
        )}
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
            disabled={!online || busy}
          >
            {sending ? copy.signIn.form.sending : copy.signIn.form.send}
          </Button>
          {guest && !signedOut && (
            <Button
              variant="secondary"
              icon={UserRound}
              disabled={!online || busy}
              onClick={() => onAction({ type: "guest" })}
            >
              {copy.signIn.form.guest}
            </Button>
          )}
        </Actions>
        {state.step === "form" && state.error === "guest" && (
          <span role="alert" {...stylex.props(styles.failure)}>
            {copy.signIn.form.guestFailed}
          </span>
        )}
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

function fieldError(error: "invalid" | "failed" | "guest" | undefined): string | undefined {
  return error === "invalid" || error === "failed" ? copy.signIn.form[error] : undefined;
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

function BackTimer({ seconds }: { seconds: number }) {
  return (
    <span role="timer" aria-live="off" {...stylex.props(styles.backTimer)}>
      {copy.signIn.differentEmailIn(seconds)}
    </span>
  );
}

function SentStep({ email, backIn, onAction }: StepProps & { email: string; backIn: number }) {
  const { sent } = copy.signIn;

  return (
    <>
      <Heading eyebrow={copy.signIn.eyebrow} title={sent.title}>
        <Email before={sent.before} email={email} after={sent.after} />
      </Heading>
      <StatusTile icon={Mail}>{sent.expires}</StatusTile>
      <Actions>
        {backIn > 0 ? <BackTimer seconds={backIn} /> : <BackButton onAction={onAction} />}
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

function SignInStep({ time, ...props }: StepProps & { time: Date }) {
  const { state } = props;

  switch (state.step) {
    case "opening":
      return null;
    case "form":
    case "sending":
    case "guest":
      return <FormStep {...props} />;
    case "sent":
      return (
        <SentStep {...props} email={state.email} backIn={differentEmailIn(state.sentAt, time)} />
      );
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
