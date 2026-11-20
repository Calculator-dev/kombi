import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@/components/Analytics";
import { CookieConsent } from "@/components/CookieConsent";
import { SPLASH_SCRIPT, Splash } from "@/components/Splash";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { CONSENT_DEFAULT_SCRIPT } from "@/lib/consent";
import { SITE } from "@/lib/site";
// Fonts are self-hosted (no request to Google): faster, and nothing to declare under GDPR.
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Najam auta i kombija u BiH — slobodna vozila i cijena odmah | kombi.ba",
    template: "%s | kombi.ba",
  },
  description:
    "Najam auta i kombija, bez vozača. Odaberite datume i odmah vidite slobodna auta i kombije i tačnu cijenu. Plaćanje pri preuzimanju.",
  openGraph: { type: "website", locale: "bs_BA", siteName: SITE.name },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ede0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1730" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bs" suppressHydrationWarning>
      <body>
        {/* The chosen theme (or the device's) is set before anything is drawn, so the page never flashes. */}
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        {/* Consent defaults must exist before Google Tag Manager loads. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {CONSENT_DEFAULT_SCRIPT}
        </Script>
        {/* The logo with its van driving, until the page has loaded. */}
        <Splash />
        <Script id="splash-hide" strategy="beforeInteractive">
          {SPLASH_SCRIPT}
        </Script>
        <noscript>
          <style>{"#splash{display:none}"}</style>
        </noscript>
        {children}
        <Suspense>
          <Analytics />
          <CookieConsent />
        </Suspense>
      </body>
    </html>
  );
}
