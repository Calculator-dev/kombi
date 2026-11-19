import type { Metadata } from "next";
import { CookieSettingsLink } from "@/components/CookieConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Which cookies kombi.ba uses, why, and how to change your choice.",
  alternates: { canonical: "/en/kolacici", languages: { bs: "/kolacici", en: "/en/kolacici" } },
};

const COOKIES: [string, string, string, string][] = [
  // name, who sets it, purpose, how long
  ["kombi_consent", "kombi.ba", "Remembers your cookie choice.", "6 months"],
  ["_ga, _ga_*", "Google Analytics", "Tells visitors and visits apart, for usage statistics. Only with analytics consent.", "2 years"],
  ["_gcl_au", "Google Ads", "Measures whether an ad led to a request. Only with marketing consent.", "3 months"],
  ["_fbp", "Meta (Facebook, Instagram)", "Measures ads on Facebook and Instagram. Only with marketing consent, if we run those ads.", "3 months"],
];

export default function CookiesPage() {
  return (
    <div lang="en">
      <Header locale="en" />
      <main id="sadrzaj" className="wrap legal">
        <h1 className="display h-lg">Cookies</h1>
        <p className="lead">
          Cookies are small files a website stores in your browser. We always use the necessary ones; analytics and
          marketing cookies only if you allow them.
        </p>

        <h2>What we use</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Cookie</th><th>Set by</th><th>Purpose</th><th>Lasts</th></tr>
            </thead>
            <tbody>
              {COOKIES.map(([name, who, why, how]) => (
                <tr key={name}><td className="mono">{name}</td><td>{who}</td><td>{why}</td><td>{how}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>What we don't send</h2>
        <p>
          Names, emails and phone numbers from requests never go to Google Analytics or advertising systems. We only record
          what happens on the site: searches, viewed vans, sent requests (with the amount and request number), and clicks on
          Viber, WhatsApp and call.
        </p>

        <h2>How to change your choice</h2>
        <p>
          Any time: <CookieSettingsLink />. You can also delete cookies in your browser settings. The site works the same
          without analytics and marketing cookies.
        </p>

        <h2>Contact</h2>
        <p>Privacy questions: {SITE.email}</p>
      </main>
      <Footer locale="en" />
    </div>
  );
}
