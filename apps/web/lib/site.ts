import type { Category } from "@kombi/shared";
import { dict } from "./i18n";

/**
 * Business details shown across the site. Items in [brackets] are
 * placeholders for the owner to fill in before launch.
 */
export const SITE = {
  name: "kombi.ba",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kombi.ba",
  city: "Sarajevo",
  email: "info@kombi.ba",
  replyWithin: "[2 sata]",
  /** Who runs the platform: shown in the privacy policy as the data controller. */
  operator: "Obrtnička djelatnost Staze Kotromanića, Geteova 15, [ID broj]",
  /** How long booking data is kept after the rental ends. */
  keepBookings: "[5 godina]",
};

export const FAQ = dict("bs").faq.items;

/** A question on a landing page, answered in plain words. */
export interface LandingQA {
  q: string;
  a: string;
}

export interface Landing {
  title: string;
  description: string;
  h1: string[];
  intro: string;
  /** Only vehicles of this type. */
  category?: Category;
  /** Only vehicles with at least this many seats. */
  minSeats?: number;
  /** What this page answers that the others don't: a heading and short paragraphs. */
  guide: { title: string; points: [string, string][] };
  faq: LandingQA[];
}

/**
 * Landing pages for the searches people actually type. Each answers its own
 * question (the coast, the airport, moving house…) and shows the real offer:
 * how many vehicles, which cities and what they cost, from the live listings.
 */
export const LANDINGS: Record<string, Landing> = {
  "najam-kombija-sarajevo": {
    title: "Najam kombija Sarajevo — kombiji za 8 i 9 osoba, bez vozača",
    description:
      "Najam kombija u Sarajevu: putnički kombiji za 8 i 9 osoba, bez vozača. Slobodni termini, uslovi i cijene na jednom mjestu, preuzimanje po dogovoru, bez plaćanja unaprijed.",
    h1: ["Najam kombija", "u Sarajevu"],
    intro:
      "Putnički kombiji za 8 i 9 osoba, bez vozača. Odaberite datume i vidite koji su slobodni, gdje se preuzimaju i koliko koštaju.",
    category: "passenger",
    guide: {
      title: "Kako izgleda najam kombija u Sarajevu",
      points: [
        ["Ko iznajmljuje", "Kombije objavljuju provjereni iznajmljivači i rent-a-car firme iz Sarajeva i okoline. Na stranici svakog kombija piše ko ga iznajmljuje, gdje se nalazi i koji su uslovi."],
        ["Preuzimanje", "Svaki iznajmljivač navodi svoja mjesta preuzimanja: svoju lokaciju, dostavu na vašu adresu ili Aerodrom Sarajevo. Ako se dostava plaća, iznos piše u cjenovniku vozila."],
        ["Šta vam treba", "Lična karta ili pasoš i vozačka dozvola B kategorije. Većina iznajmljivača traži najmanje 21 godinu i 2 godine vozačke; tačan uslov piše kod svakog kombija."],
        ["Plaćanje", "Ne plaćate unaprijed. Pošaljete upit, iznajmljivač potvrdi termin, a najam i depozit plaćate pri preuzimanju."],
      ],
    },
    faq: [
      { q: "Koliko košta najam kombija u Sarajevu?", a: "Zavisi od kombija, sezone i broja dana. Raspon cijena iz trenutne ponude je iznad; kad odaberete datume, za svaki kombi s objavljenom cijenom vidite tačan ukupan iznos." },
      { q: "Treba li mi posebna vozačka za kombi s 9 sjedišta?", a: "Ne. Kombi s najviše 8 putničkih mjesta plus vozač vozi se s običnom B kategorijom." },
      { q: "Mogu li preuzeti kombi na aerodromu?", a: "Kod iznajmljivača koji to nude, da. Na stranici kombija u cjenovniku piše da li je aerodrom ponuđen i koliko košta dostava." },
    ],
  },
  "kombi-9-sjedista": {
    title: "Kombi 9 sjedišta za najam — mjesta za cijelu ekipu i prtljag",
    description:
      "Iznajmite kombi s 9 sjedišta bez vozača: koliko kofera stane, kakva vozačka treba, dječija sjedišta i uslovi. Slobodni termini i cijene na jednom mjestu.",
    h1: ["Kombi", "9 sjedišta"],
    intro:
      "Kombiji s 8 i 9 sjedišta za porodice, ekipe i putovanja. Kod svakog piše koliko kofera stane uz sve putnike i šta je uključeno.",
    category: "passenger",
    minSeats: 8,
    guide: {
      title: "Na šta paziti kod kombija s 9 sjedišta",
      points: [
        ["Prtljag", "Uz svih 9 putnika prtljažnik je manji nego što izgleda. Kod svakog kombija piše koliko velikih kofera stane kad su sva sjedišta zauzeta; za more ili aerodrom uzmite duži model (npr. Long ili L2)."],
        ["Vozačka dozvola", "Za kombi s 8 putničkih mjesta i vozačem dovoljna je B kategorija. Iznajmljivači obično traže 21+ godinu i 2 godine vozačke."],
        ["Djeca", "Dječija sjedišta i ISOFIX su navedeni u opremi i dodacima. Sjedište najavite u upitu, da bude spremno pri preuzimanju."],
        ["Udobnost na dužem putu", "Klima za zadnje redove, tempomat i navigacija su u opremi kombija; u pretrazi ih možete i filtrirati."],
      ],
    },
    faq: [
      { q: "Koliko kofera stane u kombi s 9 sjedišta?", a: "Kod standardne dužine obično 3–5 velikih kofera uz sve putnike, kod produžene i do 8–9. Tačan broj za svaki kombi piše na njegovoj stranici." },
      { q: "Mogu li voziti kombi s 9 sjedišta s B kategorijom?", a: "Da, 8 putnika plus vozač je granica za B kategoriju." },
      { q: "Ima li dječijih sjedišta?", a: "Kod mnogih iznajmljivača, kao dodatak po danu. Cijena piše u cjenovniku kombija, a sjedište označite u upitu." },
    ],
  },
  "kombi-za-more": {
    title: "Kombi za more — iz BiH do Hrvatske i Crne Gore",
    description:
      "Kombi za more bez vozača: prelazak granice i zeleni karton, kilometraža, prtljag i višednevni najam. Slobodni kombiji i uslovi na jednom mjestu.",
    h1: ["Kombi", "za more"],
    intro:
      "Cijela ekipa i sav prtljag u jednom vozilu. Do Makarske, Neuma, Dubrovnika ili Budve: kod svakog kombija piše da li smije preko granice, koliko kilometara je uključeno i šta košta.",
    category: "passenger",
    guide: {
      title: "Prije puta na more provjerite",
      points: [
        ["Prelazak granice", "Za Hrvatsku, Crnu Goru i Albaniju treba zeleni karton. Kod svakog kombija u uslovima piše da li je prelazak dozvoljen i koliko košta; označite ga u upitu."],
        ["Kilometraža", "Do Makarske i nazad je oko 600 km, do Budve oko 700 km. Ako kombi ima ograničenje kilometara po danu, u uslovima piše koliko je uključeno i cijena svakog kilometra preko toga."],
        ["Osiguranje", "U uslovima piše da li je kasko uključen ili se doplaćuje i koliko je učešće u šteti. Na dužem putu kasko se isplati."],
        ["Višednevni najam", "Za 7 i više dana većina iznajmljivača daje popust, a u sezoni (jul–august) neki traže najmanji broj dana. Oboje piše u cjenovniku."],
      ],
    },
    faq: [
      { q: "Smijem li s kombijem u Hrvatsku ili Crnu Goru?", a: "Kod iznajmljivača koji to dozvoljavaju, da, uz zeleni karton. To i cijena pišu u uslovima kombija; prelazak označite u upitu." },
      { q: "Koliko kilometara je uključeno?", a: "Zavisi od iznajmljivača: negdje je kilometraža neograničena, negdje je uključen broj kilometara po danu. Piše u uslovima svakog kombija." },
      { q: "Isplati li se kombi umjesto dva auta?", a: "Za 7–9 osoba obično da: jedno gorivo, jedna putarina i jedan vozač, a cijeli prtljag ide zajedno." },
    ],
  },
  "rent-a-kombi-aerodrom-sarajevo": {
    title: "Rent a kombi Aerodrom Sarajevo — preuzimanje na aerodromu",
    description:
      "Kombi za cijelu porodicu na Aerodromu Sarajevo. Idealno za porodice i grupe iz dijaspore. Rezervacija bez plaćanja unaprijed, uslovi i cijena dostave na stranici.",
    h1: ["Kombi na", "aerodromu"],
    intro:
      "Slijećete s porodicom ili grupom? Kod iznajmljivača koji nude aerodrom kombi vas čeka na Aerodromu Sarajevo, a vraćate ga tamo gdje se dogovorite.",
    category: "passenger",
    guide: {
      title: "Preuzimanje na Aerodromu Sarajevo",
      points: [
        ["Dostava", "Iznajmljivač dovozi kombi na aerodrom. Da li to nudi i koliko košta dostava piše u cjenovniku kombija pod mjestima preuzimanja."],
        ["Broj leta", "U upitu upišite broj leta. Ako let kasni, iznajmljivač to vidi i čeka vas."],
        ["Za dijasporu", "Ne plaćate ništa prije dolaska. Vozačka dozvola iz EU, Švicarske ili Norveške važi u BiH; ponesite i pasoš ili ličnu kartu."],
        ["Povratak", "Kombi možete vratiti na aerodrom prije polijetanja ili na drugo mjesto koje dogovorite s iznajmljivačem."],
      ],
    },
    faq: [
      { q: "Koliko košta dostava kombija na aerodrom?", a: "Svaki iznajmljivač ima svoju cijenu; piše u cjenovniku kombija i ulazi u ukupan iznos kada je odaberete u upitu." },
      { q: "Važi li moja strana vozačka dozvola?", a: "Vozačke dozvole iz EU i većine evropskih zemalja važe za kraći boravak u BiH. Za druge provjerite uslove kod iznajmljivača u upitu." },
      { q: "Šta ako mi let kasni?", a: "Upišite broj leta u upit. Iznajmljivač prati dolazak i čeka vas; kod velikog kašnjenja javite se na kontakt iz potvrde." },
    ],
  },
  "najam-teretnog-kombija": {
    title: "Najam teretnog kombija — selidbe i prevoz kabastih stvari",
    description:
      "Iznajmite teretni kombi bez vozača za selidbu, namještaj, bijelu tehniku ili građevinski materijal. Tovarni prostor, nosivost i uslovi na stranici svakog kombija.",
    h1: ["Teretni kombi", "za kabaste stvari"],
    intro:
      "Selidba, novi kauč, mašina za veš ili materijal za gradilište. Odaberite datume i vidite koji su teretni kombiji slobodni, koliko stane u njih i koliko koštaju.",
    category: "cargo",
    guide: {
      title: "Koliki teretni kombi vam treba",
      points: [
        ["Do 6 m³", "Kauč, frižider, mašina ili nekoliko kutija. Dovoljno za manju selidbu ili kupovinu namještaja."],
        ["8–12 m³", "Selidba garsonjere ili jednosobnog stana u jednoj turi. Ovo je najčešća veličina (npr. Sprinter, Crafter, Ducato L2H2)."],
        ["13 m³ i više", "Veći stan ili kuća, dugi komadi do 4 m. Pazite na nosivost: kod svakog kombija piše koliko kilograma smije nositi."],
        ["Vozačka", "Teretni kombi do 3,5 t vozi se s B kategorijom. Tovarni prostor i nosivost pišu na stranici svakog kombija."],
      ],
    },
    faq: [
      { q: "Mogu li teretni kombi iznajmiti na nekoliko sati?", a: "Najkraći najam je jedan dan. Ako vam treba samo nekoliko sati, pitajte iznajmljivača u upitu za cijenu." },
      { q: "Koliko m³ treba za selidbu stana?", a: "Za jednosoban stan obično 10–12 m³, za dvosoban 15–20 m³ ili dvije ture." },
      { q: "Treba li mi C kategorija?", a: "Ne, za teretne kombije do 3,5 tone dovoljna je B kategorija." },
    ],
  },
  "rent-a-car-sarajevo": {
    title: "Rent a car Sarajevo — najam automobila bez vozača",
    description:
      "Najam automobila bez vozača u Sarajevu i BiH. Slobodni termini, uslovi i cijene na jednom mjestu, preuzimanje po dogovoru, bez plaćanja unaprijed.",
    h1: ["Rent a car", "bez čekanja"],
    intro:
      "Auto za grad, posao ili put. Odaberite datume i odmah vidite koja su auta slobodna; gdje je iznajmljivač objavio cijenu, vidite i tačan iznos.",
    category: "car",
    guide: {
      title: "Najam auta preko kombi.ba",
      points: [
        ["Bez šaltera", "Upit šaljete s ove stranice, a iznajmljivač vam potvrdi termin. Ne plaćate unaprijed i nema skrivenih naknada: sve što se plaća piše u cjenovniku."],
        ["Mjenjač i gorivo", "U pretrazi filtrirajte automatski ili manuelni mjenjač, dizel, benzin ili hibrid."],
        ["Uslovi", "Godine vozača, vozačka, depozit, kilometraža i kasko pišu kod svakog auta, prije nego pošaljete upit."],
      ],
    },
    faq: [
      { q: "Koliko košta rent a car u Sarajevu?", a: "Raspon cijena iz trenutne ponude je iznad; s odabranim datumima vidite tačan iznos za svako auto s objavljenom cijenom." },
      { q: "Treba li kreditna kartica?", a: "Na kombi.ba plaćate pri preuzimanju. Način plaćanja depozita (gotovina ili kartica) dogovarate s iznajmljivačem." },
    ],
  },
  "cijena-najma-kombija": {
    title: "Cijena najma kombija — stvarne cijene iz ponude i šta ulazi u cijenu",
    description:
      "Koliko košta najam kombija u BiH? Stvarni raspon cijena iz ponude, sezonske cijene, popust za 7+ dana, depozit i dodaci, sve javno prije upita.",
    h1: ["Cijena najma", "kombija"],
    intro:
      "Raspon cijena ispod je izračunat iz kombija koji su trenutno na stranici. Odaberite datume i za svaki kombi s objavljenom cijenom vidite tačan ukupan iznos.",
    category: "passenger",
    guide: {
      title: "Od čega se sastoji cijena",
      points: [
        ["Cijena po danu", "Osnovna cijena za 1–6 dana. Od 7 dana većina iznajmljivača daje popust, koji piše u cjenovniku."],
        ["Sezona", "U ljeto (najčešće jul i august) cijena je viša i ponekad postoji najmanji broj dana. Sezonske cijene pišu kod svakog kombija."],
        ["Depozit", "Plaća se pri preuzimanju i vraća pri povratku vozila. Nije dio cijene najma."],
        ["Dodaci", "Dječije sjedište, dodatni vozač, prelazak granice ili dostava na adresu. Plaćate samo ono što označite u upitu, a iznos vidite prije slanja."],
        ["Cijena na upit", "Neki iznajmljivači cijenu dogovaraju nakon upita. Takvi kombiji su u pretrazi označeni i prikazuju se nakon onih s objavljenom cijenom."],
      ],
    },
    faq: [
      { q: "Zašto je cijena ljeti viša?", a: "Potražnja je u sezoni najveća. Iznajmljivači zato imaju sezonske cijene, koje su javno navedene s datumima kada važe." },
      { q: "Plaćam li depozit unaprijed?", a: "Ne. Depozit se plaća pri preuzimanju i vraća pri povratku, nakon kratkog pregleda vozila." },
      { q: "Ima li skrivenih troškova?", a: "Ne bi trebalo da ih bude: sve što se plaća (dodaci, dostava, kilometri preko limita, učešće u šteti) piše kod kombija prije upita." },
    ],
  },
};
