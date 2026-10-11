# Kiosk Display Design System

Design system for a **kiosk stand calendar and weather display**: a touch screen or commercial display mounted on a floor stand that shows real-time schedules, weather forecasts and notes in lobbies, offices, schools and shared spaces. The palette changes with the seasons — **Spring, Summer, Fall, Winter**.

## Sources
- `uploads/DESIGN (1).md` — a DESIGN.md analysis of a monochrome-plus-pastel-color-block marketing system (figmaSans/figmaMono, pill CTAs, lime/lilac/cream/mint/pink/coral/navy blocks). It is used here as the **visual language reference only**; this system carries no third-party branding.
- No codebase, Figma file, screenshots, logo or product UI were provided. Components and the UI kit are original, built from the reference's foundations and adapted for a standing-distance touch display.

## Products
One surface: the **kiosk display app** (landscape 1920×1080 by default; also works in portrait with the same components). Views: Today, Calendar, Weather, Notes, Settings.

---

## Content fundamentals
- **Voice:** a helpful building sign. Plain, calm, factual. Speaks to everyone in the room, so no "I"; "you" only in instructions ("Leave a note for the team", "Ask the desk").
- **Casing:** sentence case for everything — headlines, buttons, tabs ("Add note", "Full calendar", "Display settings"). Mono eyebrows/captions are UPPERCASE via CSS, written in sentence case in source.
- **Brevity:** readable from 2 m. Titles ≤ 6 words, body ≤ 2 lines. Lead with the fact: "Rain moving in after 4 PM", not "Weather update".
- **Time & numbers:** 12-hour clock with mono AM/PM ("10:41 AM"), ranges with an en dash ("10:30 – 11:15"), degrees with no unit letter ("64°"), percentages for precipitation ("80%").
- **Labels:** eyebrows name the zone and count ("Today · 5 events", "Next 8 hours", "7-day forecast").
- **Emoji:** not used in UI chrome. User-written notes may contain whatever people type.
- **Examples:** "Happening now" · "Nothing scheduled. Rooms are open for booking at the front desk." · "Umbrellas are available at the front desk." · "Post note".

## Visual foundations
- **Core:** monochrome frame — black ink (#000) on white canvas (#fff). No mid-gray text: hierarchy comes from Geist's variable weight (320/330/340 body & display, 480 buttons, 540 headlines, 700 card titles), never from opacity.
- **Color blocks:** large flat pastel panels (24px radius, 48px padding) are the main structural and depth device. Each zone of a screen gets one block; white canvas gutters (24px) separate them.
- **Seasons:** `data-season="spring|summer|fall|winter"` on any root swaps the semantic block set:
  - Spring — lime, pink, mint, lilac · soft cream · deep navy · accent magenta
  - Summer — sun, coral, sky, lime · soft cream · deep sea · accent tangerine
  - Fall — amber, rust, sage, coral · soft cream · deep bark · accent ember
  - Winter — ice, lilac, glacier, mint · soft frost · deep midnight · accent cobalt
  - Roles: block-1 = hero/now, block-2 = notes, block-3 = weather, block-4 = highlight. "Auto" maps month → season.
- **Accent:** one seasonal accent CTA per screen at most (Banner action, event dot for alerts).
- **Type:** Geist (display, body, UI) + Geist Mono (eyebrows, captions, times). Big tight display (86/1.0/−1.72px; 64/1.1/−0.96px), kiosk numerals (clock 168/300/−6px, temperature 144/300/−5px, tabular).
- **Spacing:** 8px base — 1, 4, 8, 12, 16, 24, 32, 48, 96. Screen gutter 48px.
- **Radii:** 2 / 6 (sticky notes) / 8 (inputs, tiles) / 24 (blocks, cards) / 32 (modals) / 50 pill (every text button) / full (icon buttons, day cells). No square buttons.
- **Borders:** 1px #e6e6e6 hairline on inputs and hairline cards; #f1f1f1 row dividers.
- **Shadows:** almost none. Level 1 = hairline inset, level 2 = 0 4px 16px rgba(0,0,0,.06) for sticky notes and floating tiles, level 3 = 0 24px 64px rgba(0,0,0,.18) for modals over a 60% black scrim. Never shadow a color block.
- **Backgrounds:** solid flat color only. No gradients, textures, photos or patterns. Imagery, if added, sits in 8px-radius frames.
- **Transparency/blur:** only the 60% scrim and 16% white icon-button fill on dark surfaces. No backdrop blur.
- **Motion:** quiet. Press = scale 0.97 (120ms ease-out), tab/tile state 180ms, screen change 280ms, season cross-fade 600ms ease-in-out. Ticker scrolls linearly. No bounces.
- **Hover/press:** kiosk is touch-first, so no hover-dependent affordances. Press shrinks; fills don't darken. Selected = black primary surface (tabs, day cells, icon buttons).
- **Focus:** 2px black ring on inputs; fill doesn't change.
- **Cards:** white, 1px hairline, 24px radius, 24px padding — or #f7f7f5 soft tiles with 8px radius. White `canvas` tiles sit on color blocks.
- **Layout:** fixed TopBar (88px, wordmark · view tabs · settings) and bottom Ticker (48px black strip). Content fills the middle in a 2–3 column grid.
- **Sticky notes:** pastel, 6px corner, ±1–3° rotation, level-2 shadow — the one collage-like element.

## Iconography
- **Lucide** (CDN: `https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js`), stroke 1.75 (1.25–1.5 at large weather sizes), round caps. Rendered through the `Icon` component, which reads `window.lucide.icons`.
- **Substitution flag:** no icon set was supplied; Lucide was chosen for its thin even stroke that matches the light type weights.
- Core set: sun, cloud-sun, cloud, cloud-rain, cloud-drizzle, cloud-snow, cloud-lightning, wind, droplets, sunset, calendar-days, sticky-note, settings, plus, chevrons, x.
- No emoji, no unicode glyph icons. The color dot in EventRow is a plain circle, not an icon.

## Brand mark
**No logo was provided.** The product name ("Kiosk") is set in plain Geist 540 wherever a mark would go (TopBar, thumbnail). Replace when a real logo exists.

## Fonts
Source specifies proprietary figmaSans / figmaMono. **Substituted with Geist and Geist Mono** from Google Fonts (variable 100–900), loaded via `tokens/fonts.css`. Supply licensed font files to replace.

---

## Index
- `styles.css` — entry; imports everything in `tokens/`
- `tokens/` — `fonts.css`, `colors.css` (base + semantic), `seasons.css` (four palettes), `typography.css` (+ `.t-*` helper classes), `spacing.css` (space, radii, shadow, touch, motion), `base.css` (body reset, links, marquee keyframes)
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — React primitives (below), one card per folder
- `ui_kits/kiosk/` — interactive 1920×1080 kiosk click-through
- `thumbnail.html`, `SKILL.md`

## Components
Namespace: `window.KioskDisplayDesignSystem_21b0bf`. Load Lucide before the bundle.
- **core/** — Button, IconButton, PillTabs, Eyebrow, Icon
- **forms/** — TextInput
- **surfaces/** — ColorBlock, Card, Banner
- **navigation/** — TopBar, Ticker
- **weather/** — WeatherNow, ForecastDay
- **calendar/** — Clock, EventRow, MonthGrid
- **notes/** — StickyNote

### Mapping to the source
Button (button-primary/secondary/tertiary/magenta-promo), IconButton (button-icon-circular/inverse), PillTabs (pricing-tab), TextInput (text-input), Card (pricing-card/template-card/feature-tile), ColorBlock (color-block-section), Banner (promo-banner), TopBar (top-nav), Ticker (marquee-strip).

### Intentional additions
- **Icon** — wrapper for the Lucide glyph set.
- **Eyebrow** — mono label role as a component.
- **WeatherNow, ForecastDay, Clock, EventRow, MonthGrid, StickyNote** — kiosk-domain components the product needs; none exist in the source.
- **Seasonal palettes** (Summer/Fall/Winter colors), danger color, input error state, kiosk touch sizes and numeral type roles.
- Not ported: pricing comparison checkmark and marketing footer (no kiosk use).
