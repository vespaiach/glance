import * as stylex from "@stylexjs/stylex";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { copy } from "@/copy";
import { ServiceWorker } from "@/shell/ServiceWorker";
import { geistMono, geistSans } from "@/theme/fonts";
import { type } from "@/theme/type.stylex";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: copy.appName },
};

export const viewport: Viewport = { themeColor: "#000000" };

const GOOGLE_TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;

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
      <body {...stylex.props(styles.body)}>
        {children}
        <ServiceWorker />
        {GOOGLE_TAG_ID && <GoogleTag id={GOOGLE_TAG_ID} />}
      </body>
    </html>
  );
}

function GoogleTag({ id }: { id: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${id}");`}
      </Script>
    </>
  );
}
