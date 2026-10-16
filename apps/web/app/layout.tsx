import type { Metadata, Viewport } from "next";
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
    default: "Najam kombija Sarajevo — Toyota Proace Verso 8+1 | kombi.ba",
    template: "%s | kombi.ba",
  },
  description:
    "Najam kombija u Sarajevu: Toyota Proace Verso 2024, 9 sjedišta, bez vozača. Slobodni termini i tačna cijena odmah. Preuzimanje po dogovoru, plaćanje pri preuzimanju.",
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
      <body>{children}</body>
    </html>
  );
}
