import * as stylex from "@stylexjs/stylex";
import { copy, type TermsBlock, type TermsPart } from "@/copy";
import { colors } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";

type Section = (typeof copy.terms.sections)[number];

const text = copy.terms;

const HIGHLIGHTED = "data";

const GUTTER = "clamp(20px, 4.4vw, 48px)";

const styles = stylex.create({
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  column: {
    width: "100%",
    maxWidth: 1120,
    marginInline: "auto",
    paddingInline: GUTTER,
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 24,
    paddingBlock: 24,
  },
  link: {
    color: colors.textPrimary,
    textDecorationLine: "underline",
    textUnderlineOffset: 3,
    textDecorationThickness: { default: "auto", ":hover": 2 },
  },
  wordmark: {
    textDecorationLine: "none",
    fontSize: 28,
    fontWeight: 540,
    letterSpacing: "-0.4px",
  },
  main: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    gap: 48,
    paddingTop: 48,
    paddingBottom: 96,
  },
  intro: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: type.displayXlWeight,
    lineHeight: type.displayXlLh,
    letterSpacing: type.displayXlLs,
    textWrap: "balance",
  },
  bodyLg: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    lineHeight: type.bodyLgLh,
    letterSpacing: type.bodyLgLs,
  },
  body: {
    fontSize: type.bodySize,
    fontWeight: type.bodyWeight,
    lineHeight: type.bodyLh,
    letterSpacing: type.bodyLs,
  },
  bodySm: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    lineHeight: type.bodySmLh,
    letterSpacing: type.bodySmLs,
  },
  headline: {
    margin: 0,
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    lineHeight: type.headlineLh,
    letterSpacing: type.headlineLs,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 24,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sections: {
    display: "flex",
    flexDirection: "column",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px 48px",
  },
  section: {
    paddingBlock: 32,
  },
  ruled: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairlineSoft,
  },
  highlighted: {
    marginBlock: 16,
  },
  label: {
    flex: "0 0 200px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  text: {
    flex: "1 1 480px",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    textWrap: "pretty",
  },
  narrowText: {
    flexBasis: 400,
  },
  paragraph: {
    margin: 0,
  },
  list: {
    margin: 0,
    paddingLeft: 24,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  strong: {
    fontWeight: 700,
  },
  footer: {
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    paddingBlock: 24,
  },
});

export function TermsScreen() {
  return (
    <div {...stylex.props(styles.root)}>
      <header {...stylex.props(styles.column, styles.header)}>
        <a href="/" {...stylex.props(styles.link, styles.wordmark)}>
          {text.wordmark}
        </a>
        <a href={text.sourceHref} {...stylex.props(styles.link, styles.bodySm)}>
          {text.source}
        </a>
      </header>
      <main {...stylex.props(styles.column, styles.main)}>
        <div {...stylex.props(styles.intro)}>
          <Eyebrow>{text.eyebrow}</Eyebrow>
          <h1 {...stylex.props(styles.title)}>{text.title}</h1>
          <div {...stylex.props(styles.bodyLg)}>{text.effective}</div>
        </div>
        <InShort />
        <div {...stylex.props(styles.sections)}>
          {text.sections.map((section, index) => (
            <TermsSection
              key={section.id}
              section={section}
              number={index + 1}
              ruled={index > 0 && text.sections[index - 1]?.id !== HIGHLIGHTED}
            />
          ))}
        </div>
      </main>
      <footer {...stylex.props(styles.footer)}>
        <div {...stylex.props(styles.column, styles.footerRow)}>
          <span {...stylex.props(styles.bodySm)}>{text.footer}</span>
          <span {...stylex.props(styles.bodySm)}>{text.license}</span>
        </div>
      </footer>
    </div>
  );
}

function InShort() {
  return (
    <ColorBlock tone="soft" padding={GUTTER} aria-label={text.inShort}>
      <div {...stylex.props(styles.stack)}>
        <Eyebrow>{text.inShort}</Eyebrow>
        <div {...stylex.props(styles.cards)}>
          {text.cards.map((card) => (
            <div key={card.title} {...stylex.props(styles.card)}>
              <h3 {...stylex.props(styles.headline)}>{card.title}</h3>
              <div {...stylex.props(styles.body)}>{card.body}</div>
            </div>
          ))}
        </div>
      </div>
    </ColorBlock>
  );
}

function TermsSection({
  section,
  number,
  ruled,
}: {
  section: Section;
  number: number;
  ruled: boolean;
}) {
  const highlighted = section.id === HIGHLIGHTED;

  const content = (
    <>
      <div {...stylex.props(styles.label)}>
        <Eyebrow>{String(number).padStart(2, "0")}</Eyebrow>
        <h2 {...stylex.props(styles.headline)}>{section.title}</h2>
      </div>
      <div {...stylex.props(styles.body, styles.text, highlighted && styles.narrowText)}>
        {section.body.map((block, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the blocks are static copy that never reorders
          <Block key={index} block={block} />
        ))}
      </div>
    </>
  );

  if (highlighted) {
    return (
      <ColorBlock id={section.id} tone="sage" padding={GUTTER} xstyle={styles.highlighted}>
        <div {...stylex.props(styles.row)}>{content}</div>
      </ColorBlock>
    );
  }

  return (
    <section id={section.id} {...stylex.props(styles.row, styles.section, ruled && styles.ruled)}>
      {content}
    </section>
  );
}

function Block({ block }: { block: TermsBlock }) {
  if (typeof block === "string") return <p {...stylex.props(styles.paragraph)}>{block}</p>;

  if ("list" in block) {
    return (
      <ul {...stylex.props(styles.list)}>
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <p {...stylex.props(styles.paragraph)}>
      {block.map((part, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts are static copy that never reorders
        <Part key={index} part={part} />
      ))}
    </p>
  );
}

function Part({ part }: { part: TermsPart }) {
  if (typeof part === "string") return part;

  if ("strong" in part) return <strong {...stylex.props(styles.strong)}>{part.strong}</strong>;

  return (
    <a href={part.href} {...stylex.props(styles.link)}>
      {part.text}
    </a>
  );
}
