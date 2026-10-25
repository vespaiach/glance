import * as stylex from "@stylexjs/stylex";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Clock,
  CloudSun,
  Image,
  Leaf,
  type LucideIcon,
  Monitor,
  PanelLeftOpen,
  Pencil,
  Smartphone,
  StickyNote,
  Timer,
  Volume2,
} from "lucide-react";
import { copy, type TermsPart } from "@/copy";
import type { Season } from "@/domain/schemas";
import { season as seasonVars } from "@/theme/seasons.stylex";
import { colors } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { PillLink } from "@/ui/PillLink";
import {
  GuideArt,
  type GuideSectionId,
  HeroPreview,
  SEASON_THEMES,
  SizeArt,
} from "./components/GuideArt";
import { GuideFaq } from "./components/GuideFaq";

type Section = (typeof copy.guide.sections)[number];

type Steps = readonly (readonly TermsPart[])[];

const text = copy.guide;

const GUTTER = "clamp(20px, 4vw, 48px)";

const TWO_UP = "repeat(auto-fit, minmax(min(100%, 420px), 1fr))";

const CHIPS: readonly { icon: LucideIcon; label: string }[] = [
  { icon: CalendarDays, label: text.hero.chips.calendar },
  { icon: CloudSun, label: text.hero.chips.weather },
  { icon: StickyNote, label: text.hero.chips.notes },
  { icon: Image, label: text.hero.chips.photos },
];

const BULLETS: Partial<Record<GuideSectionId, readonly LucideIcon[]>> = {
  settings: [Leaf, Image, Clock],
  notifications: [Bell, Monitor, Smartphone, Volume2],
};

const TIPS: Partial<Record<GuideSectionId, LucideIcon>> = {
  today: PanelLeftOpen,
  calendar: Pencil,
  notes: Timer,
};

const styles = stylex.create({
  root: {
    minHeight: "100vh",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    fontFamily: type.fontSans,
    fontSize: type.bodySize,
    fontWeight: type.bodyWeight,
    lineHeight: type.bodyLh,
  },
  column: {
    maxWidth: 1200,
    marginInline: "auto",
    paddingInline: GUTTER,
  },
  header: {
    paddingBlock: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    flexWrap: "wrap",
  },
  wordmark: { fontSize: 28, fontWeight: 540, lineHeight: 1, letterSpacing: "-0.5px" },
  nav: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px 24px",
    fontSize: 17,
    fontWeight: 480,
    lineHeight: "44px",
  },
  link: {
    color: colors.textPrimary,
    textUnderlineOffset: 3,
    textDecorationThickness: { default: "auto", ":hover": 2 },
  },
  plainLink: { textDecorationLine: { default: "none", ":hover": "underline" } },
  hero: {
    backgroundColor: seasonVars.block1,
    borderRadius: 24,
    padding: "clamp(28px, 5vw, 64px)",
    display: "grid",
    gridTemplateColumns: TWO_UP,
    gap: 48,
    alignItems: "center",
  },
  stack: { display: "flex", flexDirection: "column", gap: 24, minWidth: 0 },
  title: {
    margin: 0,
    fontSize: "clamp(44px, 6.5vw, 86px)",
    fontWeight: 340,
    lineHeight: 1,
    letterSpacing: "-1.72px",
    textWrap: "balance",
  },
  lead: {
    margin: 0,
    maxWidth: 520,
    fontSize: 20,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: 17,
    fontWeight: 480,
    lineHeight: 1,
  },
  article: {
    display: "grid",
    gridTemplateColumns: TWO_UP,
    gap: 48,
    alignItems: "center",
    paddingBlock: 64,
  },
  first: { paddingTop: 96 },
  ruled: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairline,
  },
  heading: {
    margin: 0,
    fontSize: "clamp(36px, 5vw, 64px)",
    fontWeight: 340,
    lineHeight: 1.1,
    letterSpacing: "-0.96px",
    textWrap: "balance",
  },
  plainHeading: { textWrap: "wrap" },
  paragraph: { margin: 0, maxWidth: 520, textWrap: "pretty" },
  steps: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  step: { display: "grid", gridTemplateColumns: "32px minmax(0, 1fr)", gap: 16 },
  bullet: { display: "grid", gridTemplateColumns: "24px minmax(0, 1fr)", gap: 16 },
  number: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    backgroundColor: colors.black,
    color: colors.white,
    display: "grid",
    placeItems: "center",
    fontFamily: type.fontMono,
    fontSize: 14,
    lineHeight: 1,
  },
  number1: { backgroundColor: seasonVars.block1, color: colors.textPrimary },
  number2: { backgroundColor: seasonVars.block3, color: colors.textPrimary },
  number3: { backgroundColor: seasonVars.block4, color: colors.textPrimary },
  stepText: { paddingTop: 3, textWrap: "pretty" },
  bulletIcon: { marginTop: 2, display: "flex" },
  bulletText: { textWrap: "pretty" },
  strong: { fontWeight: 540 },
  small: { fontSize: 16, fontWeight: 330, lineHeight: 1.45, textWrap: "pretty" },
  tip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    padding: "16px 20px",
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  tipIcon: { marginTop: 2, display: "flex", flexShrink: 0 },
  sizes: {
    paddingTop: 96,
    paddingBottom: 64,
    display: "flex",
    flexDirection: "column",
    gap: 40,
  },
  sizesIntro: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 },
  sizeCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: 24,
  },
  sizeCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 24,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  sizeArt: { height: 180, display: "grid", placeItems: "center" },
  sizeTitle: { fontSize: 24, fontWeight: 540, lineHeight: 1.2 },
  mono: {
    fontFamily: type.fontMono,
    fontSize: 14,
    lineHeight: 1,
    textTransform: "uppercase",
  },
  faq: {
    paddingTop: 64,
    paddingBottom: 96,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    gap: 48,
    alignItems: "start",
  },
  faqIntro: { display: "flex", flexDirection: "column", gap: 16 },
  footer: { backgroundColor: seasonVars.deep, color: colors.white },
  footerRow: {
    paddingBlock: 40,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  footerMark: { fontSize: 24, fontWeight: 540, lineHeight: 1 },
  footerLink: { color: colors.white, fontSize: 17, fontWeight: 480, lineHeight: "44px" },
});

export function GuideScreen({ season }: { season: Season }) {
  return (
    <div data-season={season} {...stylex.props(styles.root, SEASON_THEMES[season])}>
      <header {...stylex.props(styles.column, styles.header)}>
        <span {...stylex.props(styles.wordmark)}>{text.wordmark}</span>
        <nav {...stylex.props(styles.nav)}>
          {text.nav.map((item) => (
            <a key={item.href} href={item.href} {...stylex.props(styles.link, styles.plainLink)}>
              {item.label}
            </a>
          ))}
          <PillLink href="/" icon={ArrowLeft}>
            {text.back}
          </PillLink>
        </nav>
      </header>
      <section {...stylex.props(styles.column)}>
        <Hero />
      </section>
      <main {...stylex.props(styles.column)}>
        {text.sections.map((section, index) => (
          <GuideSection key={section.id} section={section} first={index === 0} season={season} />
        ))}
        <Sizes />
        <section id="faq" {...stylex.props(styles.faq, styles.ruled)}>
          <div {...stylex.props(styles.faqIntro)}>
            <Eyebrow>{text.faq.eyebrow}</Eyebrow>
            <h2 {...stylex.props(styles.heading, styles.plainHeading)}>{text.faq.title}</h2>
          </div>
          <GuideFaq />
        </section>
      </main>
      <footer {...stylex.props(styles.footer)}>
        <div {...stylex.props(styles.column, styles.footerRow)}>
          <span {...stylex.props(styles.footerMark)}>{text.footer.wordmark}</span>
          <a href="/terms" {...stylex.props(styles.link, styles.footerLink)}>
            {text.footer.terms}
          </a>
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <div {...stylex.props(styles.hero)}>
      <div {...stylex.props(styles.stack)}>
        <Eyebrow>{text.hero.eyebrow}</Eyebrow>
        <h1 {...stylex.props(styles.title)}>{text.hero.title}</h1>
        <p {...stylex.props(styles.lead)}>{text.hero.body}</p>
        <div {...stylex.props(styles.chips)}>
          {CHIPS.map((chip) => (
            <span key={chip.label} {...stylex.props(styles.chip)}>
              <Icon icon={chip.icon} size={20} />
              {chip.label}
            </span>
          ))}
        </div>
      </div>
      <HeroPreview />
    </div>
  );
}

function GuideSection({
  section,
  first,
  season,
}: {
  section: Section;
  first: boolean;
  season: Season;
}) {
  const tip = TIPS[section.id];

  return (
    <article id={section.id} {...stylex.props(styles.article, first ? styles.first : styles.ruled)}>
      <div {...stylex.props(styles.stack)}>
        <Eyebrow>{section.eyebrow}</Eyebrow>
        <h2 {...stylex.props(styles.heading)}>{section.title}</h2>
        {"intro" in section && <p {...stylex.props(styles.paragraph)}>{section.intro}</p>}
        <StepList id={section.id} steps={section.steps} />
        {"after" in section && (
          <p {...stylex.props(styles.paragraph, styles.small)}>{section.after}</p>
        )}
        {"tip" in section && tip && (
          <div {...stylex.props(styles.tip)}>
            <span {...stylex.props(styles.tipIcon)}>
              <Icon icon={tip} size={22} />
            </span>
            <span {...stylex.props(styles.small)}>
              <Rich parts={section.tip} />
            </span>
          </div>
        )}
      </div>
      <GuideArt id={section.id} season={season} />
    </article>
  );
}

function StepList({ id, steps }: { id: GuideSectionId; steps: Steps }) {
  const bullets = BULLETS[id];

  if (bullets) {
    return (
      <ul {...stylex.props(styles.steps)}>
        {steps.map((step, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the steps are static copy that never reorders
          <li key={index} {...stylex.props(styles.bullet)}>
            <span {...stylex.props(styles.bulletIcon)}>
              <Icon icon={bullets[index] ?? Bell} size={24} />
            </span>
            <span {...stylex.props(styles.bulletText)}>
              <Rich parts={step} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ol {...stylex.props(styles.steps)}>
      {steps.map((step, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the steps are static copy that never reorders
        <li key={index} {...stylex.props(styles.step)}>
          <span {...stylex.props(styles.number, id === "today" && numberTone(index))}>
            {index + 1}
          </span>
          <span {...stylex.props(styles.stepText)}>
            <Rich parts={step} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Sizes() {
  return (
    <section id="sizes" {...stylex.props(styles.sizes, styles.ruled)}>
      <div {...stylex.props(styles.sizesIntro)}>
        <Eyebrow>{text.sizes.eyebrow}</Eyebrow>
        <h2 {...stylex.props(styles.heading)}>{text.sizes.title}</h2>
        <p {...stylex.props(styles.paragraph)}>{text.sizes.body}</p>
      </div>
      <div {...stylex.props(styles.sizeCards)}>
        {text.sizes.items.map((item) => (
          <div key={item.id} {...stylex.props(styles.sizeCard)}>
            <div aria-hidden {...stylex.props(styles.sizeArt)}>
              <SizeArt id={item.id} />
            </div>
            <span {...stylex.props(styles.sizeTitle)}>{item.title}</span>
            <span {...stylex.props(styles.mono)}>{item.range}</span>
            <span {...stylex.props(styles.bulletText)}>{item.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Rich({ parts }: { parts: readonly TermsPart[] }) {
  return parts.map((part, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the parts are static copy that never reorders
    <RichPart key={index} part={part} />
  ));
}

function RichPart({ part }: { part: TermsPart }) {
  if (typeof part === "string") return part;

  if ("strong" in part) return <strong {...stylex.props(styles.strong)}>{part.strong}</strong>;

  return (
    <a href={part.href} {...stylex.props(styles.link)}>
      {part.text}
    </a>
  );
}

function numberTone(index: number) {
  return [styles.number1, styles.number2, styles.number3][index];
}
