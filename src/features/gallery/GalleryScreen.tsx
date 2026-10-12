"use client";

import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { Season } from "@/domain/schemas";
import { fall, summer, winter } from "@/theme/themes";
import { colors, radii, sizes, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { SeasonGallery } from "./SeasonGallery";
import { gallery, SEASONS } from "./samples";

const THEMES = { spring: null, summer, fall, winter } satisfies Record<Season, unknown>;

const styles = stylex.create({
  page: {
    minHeight: "100dvh",
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.md,
    paddingBlock: space.sm,
    paddingInline: sizes.kioskGutter,
    backgroundColor: colors.surfaceCanvas,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderHairline,
  },
  title: {
    margin: 0,
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
  },
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.xs,
  },
  link: {
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    textDecoration: "none",
  },
  season: {
    paddingInline: sizes.kioskGutter,
    paddingBottom: space.xxl,
    scrollMarginTop: 64,
  },
});

export function GalleryScreen() {
  return (
    <main {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>{gallery.title}</h1>
        <nav {...stylex.props(styles.nav)}>
          {SEASONS.map((season) => (
            <a key={season} href={`#${season}`} {...stylex.props(styles.link)}>
              {copy.season[season]}
            </a>
          ))}
        </nav>
      </header>
      {SEASONS.map((season) => (
        <section key={season} id={season} {...stylex.props(styles.season, THEMES[season])}>
          <SeasonGallery season={season} />
        </section>
      ))}
    </main>
  );
}
