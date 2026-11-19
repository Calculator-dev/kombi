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
  operator: "[naziv firme ili obrta, adresa, ID broj]",
  /** How long booking data is kept after the rental ends. */
  keepBookings: "[5 godina]",
};

export const FAQ = dict("bs").faq.items;

/** Landing pages for the searches people actually type. */
export const LANDINGS: Record<
  string,
  { title: string; description: string; h1: string[]; intro: string; /** Only vans of this type. */ category?: Category }
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
  "najam-teretnog-kombija": {
    title: "Najam teretnog kombija — selidbe i prevoz kabastih stvari",
    description:
      "Iznajmite teretni kombi bez vozača za selidbu, namještaj, bijelu tehniku ili građevinski materijal. Tovarni prostor i nosivost na stranici, cijena odmah.",
    h1: ["Teretni kombi", "za kabaste stvari"],
    intro:
      "Selidba, novi kauč, mašina za veš ili materijal za gradilište. Odaberite datume i vidite koji su teretni kombiji slobodni, koliko stane u njih i koliko koštaju.",
    category: "cargo",
  },
  "rent-a-car-sarajevo": {
    title: "Rent a car Sarajevo — najam automobila, cijena odmah",
    description:
      "Najam automobila bez vozača u Sarajevu i BiH. Slobodni termini i tačna cijena odmah na stranici, preuzimanje po dogovoru, bez plaćanja unaprijed.",
    h1: ["Rent a car", "bez čekanja"],
    intro:
      "Auto za grad, posao ili put. Odaberite datume i odmah vidite koja su auta slobodna i koliko koštaju, bez plaćanja unaprijed.",
    category: "car",
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
