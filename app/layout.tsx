import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { geistMono, geistSans } from "@/theme/fonts";
import { type } from "@/theme/type.stylex";
import "./globals.css";

const styles = stylex.create({
  body: {
    margin: 0,
    fontFamily: type.fontSans,
    fontWeight: type.bodyWeight,
    WebkitFontSmoothing: "antialiased",
  },
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body {...stylex.props(styles.body)}>{children}</body>
    </html>
  );
}
