import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politika privatnosti",
  description: "Koje lične podatke kombi.ba prikuplja kod upita i rezervacije, zašto, kome ih daje i koja su vaša prava.",
  alternates: { canonical: "/privatnost", languages: { bs: "/privatnost", en: "/en/privatnost" } },
};

const DATA: [string, string, string][] = [
  // what, why, when
  ["Ime i prezime, email, telefon, način kontakta (Viber, WhatsApp, poziv, email)", "Da vam odgovorimo na upit i dogovorimo preuzimanje.", "Svaki upit"],
  ["Datum rođenja i godina vozačke dozvole", "Provjera uslova vlasnika (minimalna starost i staž vozača).", "Svaki upit"],
  ["Datumi, mjesto preuzimanja, dodaci i napomena", "Rezervacija i obračun cijene.", "Svaki upit"],
  ["Adresa, JMB, broj lične karte, broj vozačke dozvole", "Popunjavanje ugovora o najmu.", "Samo ako ih upišete; možete ih dati i pri preuzimanju"],
  ["Ime, email, telefon, adresa i ID broj firme vlasnika kombija", "Račun vlasnika, objava kombija i ugovor o najmu (vlasnik je najmodavac).", "Registracija vlasnika"],
];

const PROCESSORS: [string, string, string][] = [
  // who, what for, where
  ["Render", "Server na kojem rade stranica i aplikacija", "Njemačka (Frankfurt)"],
  ["Supabase", "Baza podataka i prijava vlasnika", "Server koji je odabran pri postavljanju projekta"],
  ["Backblaze", "Fotografije kombija (bez ličnih podataka)", "EU"],
  ["Resend", "Slanje emailova o upitu i rezervaciji", "SAD"],
  ["Google (Tag Manager, Analytics)", "Statistika posjeta, samo uz vaš pristanak na kolačiće, bez imena i kontakata", "SAD i EU"],
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="sadrzaj" className="wrap legal">
        <h1 className="display h-lg">Politika privatnosti</h1>
        <p className="lead">
          Ovdje piše koje lične podatke tražimo kad pošaljete upit za kombi, zašto ih trebamo, kome ih dajemo i kako ih
          možete vidjeti, ispraviti ili obrisati.
        </p>

        <h2>Ko je odgovoran</h2>
        <p>
          Platformu {SITE.name} vodi {SITE.operator}. Za pitanja o vašim podacima pišite na {SITE.email}.
        </p>
        <p>
          Kombije na {SITE.name} iznajmljuju njihovi vlasnici. Kad pošaljete upit za neki kombi, njegov vlasnik dobija vaše
          podatke iz upita, jer on potvrđuje rezervaciju, predaje vam kombi i s vama potpisuje ugovor. Za podatke koje
          dobije, vlasnik je odgovoran i sam.
        </p>

        <h2>Koje podatke prikupljamo i zašto</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Podaci</th><th>Zašto</th><th>Kada</th></tr>
            </thead>
            <tbody>
              {DATA.map(([what, why, when]) => (
                <tr key={what}><td>{what}</td><td>{why}</td><td>{when}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Podatke obrađujemo jer su potrebni da bismo na vaš zahtjev pripremili i izvršili ugovor o najmu, i zbog zakonskih
          obaveza (npr. knjigovodstvo). Statistiku posjeta vodimo samo ako to dozvolite u postavkama kolačića.
        </p>
        <p>
          Za statistiku vlasnicima brojimo samo koliko je puta otvorena stranica kombija i forma za rezervaciju. Uz to ne
          čuvamo ništa o posjetiocu.
        </p>

        <h2>Kome dajemo podatke</h2>
        <ul>
          <li>Vlasniku kombija za koji šaljete upit.</li>
          <li>
            Firmama koje za nas vode tehniku. One podatke obrađuju samo po našem nalogu i ne koriste ih u svoje svrhe:
          </li>
        </ul>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Firma</th><th>Za šta</th><th>Gdje su podaci</th></tr>
            </thead>
            <tbody>
              {PROCESSORS.map(([who, what, where]) => (
                <tr key={who}><td>{who}</td><td>{what}</td><td>{where}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Podatke ne prodajemo i ne dajemo za oglase. Imena, emailovi, telefoni i brojevi dokumenata nikad ne idu u Google
          Analytics niti u oglasne sisteme. Državnim organima podatke dajemo samo kad to zakon traži.
        </p>

        <h2>Ugovor o najmu</h2>
        <p>
          Kad vlasnik potvrdi rezervaciju, emailom dobijate link na ugovor popunjen vašim podacima. Link je samo vaš i ne
          treba ga prosljeđivati. Stranica s ugovorom se ne pojavljuje na Googleu.
        </p>

        <h2>Koliko dugo čuvamo podatke</h2>
        <ul>
          <li>Upit koji nije potvrđen brišemo kad više nije potreban, najkasnije godinu dana nakon traženih datuma.</li>
          <li>Podatke rezervacije i ugovora čuvamo {SITE.keepBookings} nakon završetka najma, zbog knjigovodstva i mogućih sporova (npr. šteta ili kazne).</li>
          <li>Račun vlasnika čuvamo dok ga vlasnik ne zatvori.</li>
        </ul>

        <h2>Vaša prava</h2>
        <p>Možete tražiti:</p>
        <ul>
          <li>kopiju podataka koje imamo o vama;</li>
          <li>ispravku netačnih podataka;</li>
          <li>brisanje, osim podataka koje moramo čuvati po zakonu;</li>
          <li>da prestanemo s obradom ili da vam podatke damo u obliku koji možete prenijeti drugome.</li>
        </ul>
        <p>
          Pišite na {SITE.email}. Odgovaramo u roku od 30 dana. Ako mislite da vaše podatke ne obrađujemo kako treba,
          možete se žaliti Agenciji za zaštitu ličnih podataka u Bosni i Hercegovini.
        </p>

        <h2>Kolačići</h2>
        <p>
          Koje kolačiće koristimo i kako promijeniti izbor piše na stranici <Link href="/kolacici">Kolačići</Link>.
        </p>

        <h2>Izmjene</h2>
        <p>Ako promijenimo ovu politiku, novu verziju objavljujemo ovdje. Zadnja izmjena: 18.11.2026.</p>
      </main>
      <Footer />
    </>
  );
}
