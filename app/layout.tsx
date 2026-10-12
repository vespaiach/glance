import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import { geistMono, geistSans } from "@/theme/fonts";
import { type } from "@/theme/type.stylex";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: copy.appName },
};

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
