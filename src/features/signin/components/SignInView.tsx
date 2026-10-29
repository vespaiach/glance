"use client";

import * as stylex from "@stylexjs/stylex";
import {
  ArrowRight,
  ChevronLeft,
  CircleCheck,
  Info,
  LogOut,
  Mail,
  QrCode,
  RotateCw,
  Undo2,
  WifiOff,
} from "lucide-react";
import { type FormEvent, type Ref, useRef } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { QrOpens } from "@/domain/qrSignIn";
import type { Season } from "@/domain/schemas";
import { CODE_LENGTH, differentEmailIn, firstName, isSwitchingEmail } from "@/domain/signIn";
import type { Clock as ClockSetting } from "@/domain/time";
import { PlaceForm, type WeatherSetupFlow } from "@/features/weather";
import { colors, motion, shadows, sizes, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { CodeField } from "@/ui/CodeField";
import { useFieldInView } from "@/ui/fieldInView";
import { Icon } from "@/ui/Icon";
import { TextInput } from "@/ui/TextInput";
import { signInLayout } from "../layout";
import type { ScanControls } from "../scan";
import type { SignInAction, SignInState } from "../signIn";
import { Scanner } from "./Scanner";
import { ScanSheet } from "./ScanSheet";
import { SignInHero } from "./SignInHero";
import {
  Actions,
  Email,
  GuideLine,
  Heading,
  LockFooter,
  StatusTile,
  SwitchTile,
  TermsLine,
} from "./SignInParts";

type SignedOut = { email: string; pending: number };

type CodeState = Extract<SignInState, { step: "sent" | "checking" | "locked" }>;

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
  opens?: QrOpens;
  scan?: ScanControls;
  onAction: (action: SignInAction) => void;
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
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  skip: {
    display: "flex",
    paddingTop: space.lg,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  scanEntry: {
    display: "flex",
  },
  ring: {
    boxShadow: shadows.shadow1,
  },
  waitTimer: {
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
  scan,
  ...step
}: SignInViewProps) {
  const tall = breakpoint !== "small";

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
          small={breakpoint === "small"}
          xstyle={tall && styles.heroTall}
        />
        <div {...stylex.props(styles.panel)}>
          <SignInStep {...step} {...(breakpoint !== "large" && scan && { scan })} time={time} />
        </div>
      </main>
      {scan && <ScanLayer scan={scan} />}
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

function ScanLayer({ scan: { state, stream, act } }: { scan: ScanControls }) {
  switch (state.step) {
    case "ask":
    case "blocked":
    case "nocam":
      return <ScanSheet sheet={state.step} asking={false} onAction={act} />;
    case "asking":
      return state.sheet ? (
        <ScanSheet sheet={state.sheet} asking onAction={act} />
      ) : (
        <Scanner step="asking" onAction={act} />
      );
    case "scanning":
    case "wrong":
    case "found":
      return <Scanner step={state.step} {...(stream && { stream })} onAction={act} />;
    default:
      return null;
  }
}

function ScanEntry({ scan, disabled }: { scan: ScanControls; disabled: boolean }) {
  return (
    <div {...stylex.props(styles.scanEntry)}>
      <Button
        variant="secondary"
        icon={QrCode}
        disabled={disabled}
        onClick={scan.open}
        xstyle={styles.ring}
      >
        {copy.signIn.scan.entry}
      </Button>
    </div>
  );
}

function FormStep({ state, signedOut, online, scan, onAction }: StepProps) {
  const sending = state.step === "sending";

  const email = state.step === "form" || sending ? state.email : "";

  const error = state.step === "form" && state.error ? copy.signIn.form[state.error] : undefined;

  const switching =
    signedOut !== undefined && isSwitchingEmail(signedOut.email, email, signedOut.pending);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (online && !sending) onAction({ type: "send" });
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
        {scan?.state.step === "expired" && (
          <StatusTile icon={Info}>{copy.signIn.scan.stale}</StatusTile>
        )}
        <Actions>
          <Button
            type="submit"
            iconRight={sending ? undefined : ArrowRight}
            disabled={!online || sending}
          >
            {sending ? copy.signIn.form.sending : copy.signIn.form.send}
          </Button>
        </Actions>
        {scan && !signedOut && <ScanEntry scan={scan} disabled={!online || sending} />}
      </form>
      {sending && (
        <StatusTile icon={Mail} pulsing>
          <Email before={copy.signIn.form.sendingTo} email={email} after="" />
        </StatusTile>
      )}
      <LockFooter />
      <TermsLine />
      <GuideLine />
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

function ResendButton({
  variant,
  disabled,
  onAction,
}: Pick<StepProps, "onAction"> & { variant?: "ghost"; disabled?: boolean }) {
  return (
    <Button
      variant={variant}
      icon={RotateCw}
      disabled={disabled}
      onClick={() => onAction({ type: "send" })}
    >
      {copy.signIn.resend}
    </Button>
  );
}

function WaitTimer({ seconds }: { seconds: number }) {
  return (
    <span role="timer" aria-live="off" {...stylex.props(styles.waitTimer)}>
      {copy.signIn.waitFor(seconds)}
    </span>
  );
}

function CodeStep({ state, time, online, onAction }: StepProps & { state: CodeState; time: Date }) {
  const { code } = copy.signIn;

  const checking = state.step === "checking";

  const locked = state.step === "locked";

  const digits = locked ? "" : state.code;

  const waitFor = locked ? 0 : differentEmailIn(state.sentAt, time);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    onAction({ type: "verify", online });
  };

  return (
    <>
      <Heading eyebrow={copy.signIn.eyebrow} title={code.title}>
        <Email before={code.before} email={state.email} after={code.after} />
      </Heading>
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        <CodeField
          label={code.label}
          value={digits}
          onChange={(text) => onAction({ type: "code", text, online })}
          error={codeError(state)}
          busy={checking}
          disabled={locked}
          autoFocus
        />
        {!online && (
          <Banner tone="soft" icon={WifiOff} title={code.offlineTitle} body={code.offlineBody} />
        )}
        <Actions>
          <Button
            type="submit"
            iconRight={checking ? undefined : ArrowRight}
            disabled={!online || checking || locked || digits.length < CODE_LENGTH}
          >
            {checking ? code.checking : code.submit}
          </Button>
        </Actions>
      </form>
      <Actions ruled>
        {waitFor > 0 ? (
          <WaitTimer seconds={waitFor} />
        ) : (
          <>
            <ResendButton variant="ghost" disabled={!online} onAction={onAction} />
            <BackButton onAction={onAction} />
          </>
        )}
      </Actions>
    </>
  );
}

function codeError(state: CodeState): string | undefined {
  if (state.step === "locked") return copy.signIn.code.locked;

  return state.step === "sent" && state.wrong ? copy.signIn.code.wrong : undefined;
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

function ExpiredStep({
  state,
  online,
  onAction,
}: StepProps & { state: Extract<SignInState, { step: "expired" }> }) {
  const { expired } = copy.signIn;

  return (
    <>
      <Heading eyebrow={copy.signIn.eyebrow} title={expired.title}>
        <Email before={expired.before} email={state.email} after={expired.after} />
      </Heading>
      <Actions>
        <ResendButton disabled={!online} onAction={onAction} />
        <BackButton onAction={onAction} />
      </Actions>
    </>
  );
}

function DoneStep({
  state,
  opens,
}: {
  state: Extract<SignInState, { step: "done" }>;
  opens?: QrOpens;
}) {
  const { done } = copy.signIn;

  const welcome = state.returning ? done.welcomeBack : done.welcome;

  return (
    <>
      <Icon icon={CircleCheck} size={56} strokeWidth={1.25} />
      <Heading eyebrow={done.eyebrow} title={welcome(firstName(state.name))}>
        {opensBody(opens)}
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
      return <FormStep {...props} />;
    case "sent":
    case "checking":
    case "locked":
      return <CodeStep {...props} state={state} time={time} />;
    case "name":
      return <NameStep {...props} state={state} />;
    case "location":
      return <LocationStep {...props} state={state} />;
    case "expired":
      return <ExpiredStep {...props} state={state} />;
    case "done":
      return <DoneStep state={state} opens={props.opens} />;
  }
}

function opensBody(opens: QrOpens | undefined): string {
  const { done } = copy.signIn;

  if (opens === "photos") return done.bodyPhotos;

  return opens === "import" ? done.bodyImport : done.body;
}
