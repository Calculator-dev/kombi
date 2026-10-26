import type { Metadata } from "next";
import { CookieSettingsLink } from "@/components/CookieConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kolačići",
  description: "Koje kolačiće koristi kombi.ba, zašto, i kako promijeniti izbor.",
  alternates: { canonical: "/kolacici" },
};

const COOKIES: [string, string, string, string][] = [
  // name, who sets it, purpose, how long
  ["kombi_consent", "kombi.ba", "Pamti vaš izbor o kolačićima.", "6 mjeseci"],
  ["_ga, _ga_*", "Google Analytics", "Razlikuje posjetioce i posjete, za statistiku korištenja. Samo uz pristanak na analitiku.", "2 godine"],
  ["_gcl_au", "Google Ads", "Mjeri da li je oglas doveo do upita. Samo uz pristanak na marketing.", "3 mjeseca"],
  ["_fbp", "Meta (Facebook, Instagram)", "Mjeri oglase na Facebooku i Instagramu. Samo uz pristanak na marketing, ako koristimo te oglase.", "3 mjeseca"],
];

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main id="sadrzaj" className="wrap legal">
        <h1 className="display h-lg">Kolačići</h1>
        <p className="lead">
          Kolačići su male datoteke koje stranica sprema u vaš preglednik. Nužne koristimo uvijek; analitičke i marketinške
          samo ako to dozvolite.
        </p>

        <h2>Šta koristimo</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Kolačić</th><th>Postavlja</th><th>Svrha</th><th>Traje</th></tr>
            </thead>
            <tbody>
              {COOKIES.map(([name, who, why, how]) => (
                <tr key={name}><td className="mono">{name}</td><td>{who}</td><td>{why}</td><td>{how}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Šta ne šaljemo</h2>
        <p>
          Imena, emailovi i brojevi telefona iz upita nikad ne idu u Google Analytics niti u oglasne sisteme. Bilježimo samo
          šta se na stranici radi: pretrage, pregledane kombije, poslane upite (s iznosom i brojem upita), klikove na Viber,
          WhatsApp i poziv.
        </p>

        <h2>Kako promijeniti izbor</h2>
        <p>
          Bilo kad: <CookieSettingsLink />. Kolačiće možete obrisati i u postavkama preglednika. Bez analitičkih i
          marketinških kolačića stranica radi jednako.
        </p>

        <h2>Kontakt</h2>
        <p>Pitanja o privatnosti: {SITE.email}</p>
      </main>
      <Footer />
    </>
  );
}
