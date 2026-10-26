import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@/components/Analytics";
import { CookieConsent } from "@/components/CookieConsent";
import { CONSENT_DEFAULT_SCRIPT } from "@/lib/consent";
import { SITE } from "@/lib/site";
// Fonts are self-hosted (no request to Google): faster, and nothing to declare under GDPR.
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
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
  themeColor: "#e9e9e4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bs">
      <body>
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
