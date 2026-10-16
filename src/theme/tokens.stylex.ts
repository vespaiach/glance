import * as stylex from "@stylexjs/stylex";

const black = "#000000";
const white = "#ffffff";
const hairline = "#e6e6e6";
const hairlineSoft = "#f1f1f1";
const surfaceSoftBase = "#f7f7f5";

export const colors = stylex.defineVars({
  black,
  white,
  hairline,
  hairlineSoft,
  surfaceSoftBase,
  blockLime: "#dceeb1",
  blockLilac: "#c5b0f4",
  blockCream: "#f4ecd6",
  blockPink: "#efd4d4",
  blockMint: "#c8e6cd",
  blockCoral: "#f3c9b6",
  blockNavy: "#1f1d3d",
  accentMagenta: "#ff3d8b",
  blockSun: "#f6e3a1",
  blockSky: "#bfdff0",
  blockSea: "#0e3a46",
  accentTangerine: "#ff6b2c",
  blockAmber: "#f0c987",
  blockRust: "#e3a684",
  blockSage: "#d6dcc0",
  blockBark: "#3b2418",
  accentEmber: "#e0472a",
  blockIce: "#d5e4f1",
  blockFrost: "#e9edf3",
  blockGlacier: "#b9cde6",
  blockMidnight: "#16213d",
  accentCobalt: "#3d63ff",
  success: "#1ea64a",
  danger: "#d92d20",
  scrim: "rgba(0,0,0,.6)",
  onInverseSoft: "rgba(255,255,255,.16)",
  textPrimary: black,
  textInverse: white,
  surfaceCanvas: white,
  surfaceInverse: black,
  surfaceSoft: surfaceSoftBase,
  borderHairline: hairline,
  borderHairlineSoft: hairlineSoft,
  actionPrimary: black,
  onActionPrimary: white,
  focusRing: black,
});

export const space = stylex.defineVars({
  hair: "1px",
  xxs: "4px",
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
  section: "96px",
});

export const radii = stylex.defineVars({
  xs: "2px",
  sm: "6px",
  md: "8px",
  lg: "24px",
  xl: "32px",
  pill: "50px",
  full: "9999px",
});

export const shadows = stylex.defineVars({
  shadow0: "none",
  shadow1: `inset 0 0 0 1px ${hairline}`,
  shadow2: "0 4px 16px rgba(0,0,0,.06)",
  shadow2Up: "0 -4px 16px rgba(0,0,0,.06)",
  shadow3: "0 24px 64px rgba(0,0,0,.18)",
});

export const sizes = stylex.defineVars({
  touchMin: "44px",
  touchKiosk: "64px",
  iconButton: "40px",
  iconButtonTouch: "56px",
  kioskWidth: "1920px",
  kioskHeight: "1080px",
  kioskGutter: "clamp(20px, 2.6vw, 40px)",
});

export const motion = stylex.defineVars({
  easeOut: "cubic-bezier(.2,.7,.2,1)",
  easeInOut: "cubic-bezier(.6,0,.3,1)",
  durPress: "120ms",
  durFast: "180ms",
  durBase: { default: "280ms", "@media (prefers-reduced-motion: reduce)": "0ms" },
  durSeason: { default: "600ms", "@media (prefers-reduced-motion: reduce)": "0ms" },
  pressScale: ".97",
});
