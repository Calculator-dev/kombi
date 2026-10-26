/**
 * Business details shown across the site. Items in [brackets] are
 * placeholders for the owner to fill in before launch.
 */
export const SITE = {
  name: "kombi.ba",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kombi.ba",
  city: "Sarajevo",
  phone: "[+387 6x xxx xxx]",
  phoneHref: "tel:+387",
  viberHref: "viber://chat?number=%2B387",
  whatsappHref: "https://wa.me/387",
  email: "[email]@kombi.ba",
  replyWithin: "[2 sata]",
};

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Gdje preuzimam kombi?",
    a: "Svaki kombi ima svoja mjesta preuzimanja, navedena na njegovoj stranici: lokacija vlasnika, vaša adresa ili aerodrom.",
  },
  {
    q: "Mogu li na more u Hrvatsku ili Crnu Goru?",
    a: "Da. Označite prelazak granice u upitu i pripremit ćemo zeleni karton.",
  },
  {
    q: "Moram li platiti unaprijed?",
    a: "Ne. Pošaljete upit, vlasnik kombija potvrdi termin, a plaćate pri preuzimanju.",
  },
  {
    q: "Kada dobijam depozit nazad?",
    a: "Pri povratku kombija, nakon kratkog pregleda vozila.",
  },
  {
    q: "Koja vozačka dozvola mi treba?",
    a: "Za većinu kombija B kategorija. Tačan uslov (godine vozača i vozačkog iskustva) piše pod „Uslovi najma“ na stranici kombija.",
  },
];

/** Landing pages for the searches people actually type. */
export const LANDINGS: Record<
  string,
  { title: string; description: string; h1: string[]; intro: string }
> = {
  "najam-kombija-sarajevo": {
    title: "Najam kombija Sarajevo — 9 sjedišta, cijena odmah",
    description:
      "Najam kombija u Sarajevu: kombiji za 8 i 9 osoba, bez vozača. Slobodni termini i tačna cijena odmah, preuzimanje po dogovoru, bez plaćanja unaprijed.",
    h1: ["Najam kombija", "u Sarajevu"],
    intro:
      "Kombiji za 8 i 9 osoba, bez vozača. Odaberite datume, pogledajte koji su slobodni i tačnu cijenu prije slanja upita.",
  },
  "kombi-za-more": {
    title: "Kombi za more — iz Sarajeva do Makarske, Neuma, Budve",
    description:
      "Iznajmite kombi za 9 osoba za more. Prelazak granice uz zeleni karton, mjesta za prtljag cijele ekipe, cijena odmah na stranici.",
    h1: ["Kombi", "za more"],
    intro:
      "Cijela ekipa i sav prtljag u jednom vozilu. Do Makarske, Neuma, Dubrovnika ili Budve, sa zelenim kartonom za prelazak granice.",
  },
  "rent-a-kombi-aerodrom-sarajevo": {
    title: "Rent a kombi Aerodrom Sarajevo — preuzimanje na aerodromu",
    description:
      "Kombi za cijelu porodicu čeka vas na Aerodromu Sarajevo. Idealno za porodice i grupe iz dijaspore. Rezervacija bez plaćanja unaprijed.",
    h1: ["Kombi na", "aerodromu"],
    intro:
      "Slijećete s porodicom ili grupom? Kombi vas čeka na Aerodromu Sarajevo, a vraćate ga tamo gdje se dogovorimo.",
  },
  "cijena-najma-kombija": {
    title: "Cijena najma kombija u Sarajevu — cjenovnik bez skrivenih troškova",
    description:
      "Koliko košta najam kombija? Cijena po danu, popust za 7+ dana, depozit i dodaci — sve javno, uz kalkulator s tačnom cijenom.",
    h1: ["Cijena najma", "kombija"],
    intro:
      "Odaberite datume i vidite tačnu cijenu, s popustom za sedmicu i više. Ispod je cijeli cjenovnik, bez sitnih slova.",
  },
};
