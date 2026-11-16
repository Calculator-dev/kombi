import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@/components/Analytics";
import { CookieConsent } from "@/components/CookieConsent";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { CONSENT_DEFAULT_SCRIPT } from "@/lib/consent";
import { SITE } from "@/lib/site";
// Fonts are self-hosted (no request to Google): faster, and nothing to declare under GDPR.
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Najam kombija u BiH — slobodni kombiji i cijena odmah | kombi.ba",
    template: "%s | kombi.ba",
  },
  description:
    "Najam kombija za 8 i 9 osoba, bez vozača. Odaberite datume i odmah vidite slobodne kombije i tačnu cijenu. Plaćanje pri preuzimanju.",
  openGraph: { type: "website", locale: "bs_BA", siteName: SITE.name },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
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
        {children}
        <Suspense>
          <Analytics />
          <CookieConsent />
        </Suspense>
      </body>
    </html>
  );
}
