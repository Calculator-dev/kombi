import type { ContractData } from "@kombi/shared";
import { km } from "./format";

/** A piece of an article: a paragraph, a list, or a table of label/value rows (values can be edited before printing). */
export type Block = string | { ul: string[] } | { ol: string[] } | { rows: [string, string][] };
export interface Article {
  title: string;
  blocks: Block[];
}

/** "21.10.2026." */
export function dotDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

/** Where the contract is signed, as it follows "u": the owner's own wording, or the van's city. */
export const placeOf = (d: ContractData) => d.terms.place || `mjestu ${d.van.location}`;

const moment = (date: string, time: string) => `${dotDate(date)} godine${time ? ` u ${time} sati` : ""}`;

export const lessorRows = (d: ContractData): [string, string][] => [
  ["Najmodavac", d.lessor.name],
  ["Adresa", d.lessor.address],
  ["ID broj", d.lessor.companyId],
  ...(d.lessor.representative ? ([["Zastupanje", d.lessor.representative]] as [string, string][]) : []),
  ["Telefon", d.lessor.phone],
  ["E-mail", d.lessor.email],
];

export const renterRows = (d: ContractData): [string, string][] => [
  ["Najmoprimac", d.renter.name],
  ["JMB", d.renter.jmb],
  ["Broj lične karte", d.renter.idNumber],
  ["Broj vozačke dozvole", d.renter.licenseNumber],
  ["Adresa prebivališta", d.renter.address],
  ["Telefon", d.renter.phone],
  ["E-mail", d.renter.email],
];

export const PREAMBLE = [
  "Najmoprimac izjavljuje i potvrđuje da su svi lični i kontakt podaci navedeni u ovom Ugovoru, uključujući adresu prebivališta, tačni i potpuni. Najmoprimac odgovara za posljedice davanja netačnih ili nepotpunih podataka.",
  "Najmoprimac je dužan prije preuzimanja vozila predočiti važeću ličnu kartu i/ili pasoš, vozačku dozvolu, a sve radi utvrđivanja identiteta i prava upravljanja vozilom. Najmodavac ima pravo izvršiti uvid u navedene isprave te po potrebi zadržati njihovu fotografiju ili elektronsku kopiju za potrebe izvršenja ovog ugovora i zaštite svojih pravnih interesa.",
];

/** The articles of the rental contract, with this booking's data filled in. */
export function contractArticles(d: ContractData): Article[] {
  const t = d.terms;
  const years = (n: number) =>
    `${n} ${n % 10 === 1 && n % 100 !== 11 ? "godinu" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "godine" : "godina"}`;
  return [
    {
      title: "Predmet ugovora",
      blocks: [
        "Najmodavac daje, a Najmoprimac prima u najam putničko vozilo:",
        {
          rows: [
            ["Marka i model", d.van.name],
            ["Registarske oznake", t.plates],
            ["Broj šasije", t.vin],
            ["Godina proizvodnje", `${d.van.year}.`],
            ["Boja", t.color],
          ],
        },
      ],
    },
    {
      title: "Trajanje najma",
      blocks: [
        {
          rows: [
            ["Najam traje od", moment(d.start, d.pickupTime)],
            ["Najam traje do", moment(d.end, d.returnTime)],
          ],
        },
        "Najmoprimac je obavezan vratiti vozilo najkasnije u ugovoreno vrijeme.",
      ],
    },
    {
      title: "Područje korištenja",
      blocks: [
        "Vozilo se smije koristiti isključivo na području teritorija države Bosne i Hercegovine.",
        "Izlazak iz Bosne i Hercegovine bez prethodne pisane saglasnosti Najmodavca predstavlja bitnu povredu ovog ugovora. U takvim slučajevima Najmodavac ima pravo aktivirati sigurnosni protokol.",
      ],
    },
    {
      title: "Kontakt podaci i dostava obavijesti",
      blocks: [
        "Ugovorne strane su saglasne da se sva obavještenja, zahtjevi, opomene, izjave o raskidu ugovora i druga komunikacija vezana za ovaj ugovor mogu dostavljati putem telefona, SMS poruke, e-maila ili aplikacija za elektronsku komunikaciju (Viber, WhatsApp i sl.) na kontakte navedene u ovom ugovoru.",
        "Obavijest se smatra uredno dostavljenom trenutkom slanja na posljednji broj telefona ili e-mail adresu koju je ugovorna strana navela u ovom ugovoru, osim ako druga ugovorna strana prethodno nije pisanim putem dostavila promjenu kontakt podataka.",
        "Najmoprimac se obavezuje biti dostupan na navedenom broju telefona za vrijeme trajanja najma te bez odlaganja obavijestiti Najmodavca o svakoj promjeni kontakt podataka. Propuštanje prijave promjene kontakt podataka ne utiče na valjanost dostave izvršene na ranije prijavljene podatke.",
      ],
    },
    {
      title: "Ovlašteni vozač",
      blocks: [
        "Vozilom smije upravljati isključivo Najmoprimac. Druga osoba može upravljati vozilom samo ako je prethodno upisana u ugovor i odobrena od strane Najmodavca.",
        "Najmoprimac odgovara za radnje svih osoba kojima omogući korištenje vozila.",
      ],
    },
    {
      title: "Uvjeti za vozača",
      blocks: [
        "Najmoprimac potvrđuje da:",
        {
          ul: [
            `ima najmanje ${years(d.minDriverAge)},`,
            ...(d.minLicenseYears > 0 ? [`posjeduje važeću vozačku dozvolu najmanje ${years(d.minLicenseYears)},`] : ["posjeduje važeću vozačku dozvolu,"]),
            "nije pod zabranom upravljanja motornim vozilima,",
            "nije pod utjecajem alkohola, droga ili lijekova koji utječu na sposobnost upravljanja.",
          ],
        },
      ],
    },
    {
      title: "Cijena najma",
      blocks: [
        { rows: [["Ukupna cijena najma", d.total === null ? "" : km(d.total)]] },
        "Plaćanje se vrši unaprijed prije preuzimanja vozila.",
        "U cijenu nije uključeno:",
        { ul: ["gorivo,", "cestarine,", "parkiranje,", "saobraćajne kazne,", "dodatni kilometri,", "dodatne usluge."] },
      ],
    },
    {
      title: "Depozit",
      blocks: [
        { rows: [["Depozit", km(d.deposit)]] },
        "Depozit služi kao osiguranje za:",
        {
          ul: [
            "štetu na vozilu,",
            "nedostatak goriva,",
            "kašnjenje pri povratu,",
            "dodatnu kilometražu,",
            "izgubljeni ključ,",
            "izgubljene dokumente,",
            "oštećenje opreme,",
            "čišćenje vozila,",
            "druga dospjela potraživanja utvrđena prilikom povrata.",
          ],
        },
        "Depozit se vraća nakon pregleda vozila, najkasnije u roku od sedam dana.",
        "Vraćanje depozita ne oslobađa Najmoprimca obaveze plaćanja kazni ili drugih troškova koji budu dostavljeni Najmodavcu nakon završetka najma, a koji su nastali za vrijeme trajanja najma.",
      ],
    },
    {
      title: "Kilometraža",
      blocks: [
        {
          rows: t.kmPerDay
            ? [
                ["U cijenu najma uključeno je ukupno", `${t.kmPerDay} km/dan`],
                ["Svaki dodatni kilometar naplaćuje se", t.extraKm],
              ]
            : [["U cijenu najma uključeno je", "neograničena kilometraža"]],
        },
        "Kilometraža pri preuzimanju i pri povratu će se utvrditi Zapisnikom o primopredaji putničkog vozila koji je sastavni dio ovog ugovora. Potpisom zapisnika ugovorne strane potvrđuju tačnost navedenih podataka.",
      ],
    },
    {
      title: "Primopredaja vozila",
      blocks: [
        "Najmoprimac potvrđuje da je vozilo preuzeo:",
        { ul: ["tehnički ispravno,", "čisto,", "s punim rezervoarom goriva,", "s pripadajućom opremom,", "nakon vizualnog pregleda."] },
        "Navedeno će biti utvrđeno Zapisnikom iz Člana 9. ovog ugovora.",
      ],
    },
    {
      title: "Zabranjena upotreba vozila",
      blocks: [
        "Najmoprimcu je zabranjeno:",
        {
          ul: [
            "upravljanje pod utjecajem alkohola, droga ili lijekova koji umanjuju vozačke sposobnosti,",
            "davanje vozila trećim osobama,",
            "podnajam vozila,",
            "korištenje za auto-školu,",
            "sudjelovanje u utrkama,",
            "off-road vožnja,",
            "vuča drugih vozila,",
            "prijevoz eksplozivnih ili opasnih tvari,",
            "prijevoz životinja bez odobrenja Najmodavca,",
            "pušenje cigareta, elektroničkih cigareta, vape uređaja ili grijanih duhanskih proizvoda u vozilu.",
          ],
        },
        `Za kršenje zabrane pušenja ugovara se naknada za dubinsko čišćenje u iznosu od ${km(t.smokingFee)}.`,
      ],
    },
    {
      title: "Redovno održavanje vozila",
      blocks: [
        "Najmoprimac je obvezan vozilo koristiti s pažnjom dobrog domaćina/privrednika, u skladu s njegovom namjenom, tehničkim karakteristikama, uputama proizvođača i važećim propisima, te preduzimati sve razumne mjere radi očuvanja vozila od oštećenja, gubitka ili prekomjernog habanja. Najmoprimac je obavezan redovito pratiti stanje motora, rashladne tekućine, ulja, pritiska u gumama i svih signalnih lampica na instrument ploči.",
        "U slučaju pojave bilo kakvog upozorenja na instrument ploči ili neuobičajenog zvuka, Najmoprimac je dužan odmah zaustaviti vozilo na sigurnom mjestu i bez odgađanja obavijestiti Najmodavca.",
        "Svaka šteta nastala nastavkom vožnje nakon pojave upozorenja ili očite neispravnosti pada na teret Najmoprimca.",
      ],
    },
    {
      title: "Kvar vozila",
      blocks: [
        "Ako tokom najma dođe do kvara koji nije prouzročio Najmoprimac, Najmodavac će, ovisno o mogućnostima:",
        { ul: ["organizirati popravak,", "osigurati zamjensko vozilo ili", "raskinuti ugovor uz obračun neiskorištenog dijela najamnine."] },
        "Najmoprimac nema pravo samostalno naručivati popravke bez prethodnog odobrenja Najmodavca, osim ako je to nužno radi sprječavanja veće štete.",
      ],
    },
    {
      title: "Saobraćajna nezgoda",
      blocks: [
        "U slučaju saobraćajne nezgode Najmoprimac je obavezan:",
        {
          ol: [
            "odmah zaustaviti vozilo,",
            "pozvati policiju kada je to propisano ili potrebno,",
            "ispuniti Europsko izvješće o nezgodi,",
            "fotografirati mjesto događaja i vozila,",
            "odmah obavijestiti Najmodavca.",
          ],
        },
        "Ako Najmoprimac napusti mjesto nezgode ili ne prijavi događaj, odgovara za svu nastalu štetu koju osiguranje ne pokrije.",
      ],
    },
    {
      title: "Krađa vozila",
      blocks: [
        "U slučaju krađe ili pokušaja krađe Najmoprimac je obavezan:",
        { ul: ["odmah obavijestiti policiju,", "odmah obavijestiti Najmodavca,", "predati sve ključeve i dokumentaciju vozila."] },
        "Ako je krađa posljedica grube nepažnje Najmoprimca (ostavljanje ključa u vozilu, otključano vozilo i slično), Najmoprimac odgovara za nastalu štetu u skladu s važećim propisima i uvjetima police osiguranja.",
        "Najmoprimac je dužan po napuštanju vozila ponijeti sa sobom saobraćajnu dozvolu. Ostavljanje saobraćajne dozvole u vozilu smatra se grubom nepažnjom Najmoprimca te predstavlja osnov njegove pune materijalne odgovornosti za štetu nastalu usljed krađe ili otuđenja vozila, uključujući štetu koju osiguravatelj odbije nadoknaditi zbog takvog postupanja.",
      ],
    },
    {
      title: "Osiguranje i naknada za štetu",
      blocks: [
        "Vozilo je osigurano obaveznim osiguranjem od automobilske odgovornosti i kasko osiguranjem.",
        `U slučaju štete nastale za vrijeme trajanja najma, neovisno o tome da li je šteta pokrivena kasko osiguranjem, Najmoprimac je dužan platiti naknadu u iznosu od ${km(t.damageFee)} na ime učešća u šteti, gubitka bonusa, administrativnih troškova i povećanja budućih troškova osiguranja, osim ako je šteta nastala isključivom krivicom treće osobe i ista je u cijelosti nadoknađena od njenog osiguravatelja.`,
        "Najmoprimac gubi pravo na ograničenje odgovornosti i odgovara za cjelokupnu štetu ako:",
        {
          ul: [
            "upravlja pod utjecajem alkohola ili droga,",
            "upravlja bez važeće vozačke dozvole,",
            "napusti mjesto saobraćajne nezgode,",
            "ne prijavi nezgodu policiji kada je to obavezno,",
            "vozilo koristi protivno ovom ugovoru,",
            "vozilo koristi osoba koja nije ovlaštena ovim ugovorom,",
            "štetu prouzroči namjerno ili krajnjom nepažnjom.",
          ],
        },
      ],
    },
    {
      title: "Saobraćajne kazne i ostali troškovi",
      blocks: [
        "Najmoprimac snosi troškove:",
        {
          ul: [
            "saobraćajne kazne,",
            "parkirališne kazne,",
            "kazne za prekršaje u inostranstvu,",
            "cestarine,",
            "vinjete,",
            "troškove vučne službe nastale njegovom krivnjom,",
            "sve druge troškove nastale tokom najma.",
          ],
        },
        "Ako kazna ili drugi trošak bude dostavljen Najmodavcu nakon završetka najma, Najmoprimac je obavezan isti podmiriti u roku od osam dana od primitka zahtjeva.",
        `Najmodavac ima pravo obračunati administrativnu naknadu od ${km(t.fineFee)} za obradu svake pojedine kazne ili zahtjeva nadležnog tijela.`,
      ],
    },
    {
      title: "GPS uređaj",
      blocks: [
        "Radi zaštite vozila od krađe i zloupotrebe, vozilo može biti opremljeno GPS uređajem.",
        "Najmoprimac potvrđuje da je upoznat s postojanjem GPS uređaja i daje suglasnost za obradu podataka o lokaciji isključivo radi:",
        { ul: ["zaštite imovine,", "pronalaska vozila u slučaju krađe,", "pružanja pomoći u slučaju kvara,", "dokazivanja zloupotrebe vozila."] },
        "Iz istih razloga vozilo može biti opremljeno i sigurnosnom video kamerom za snimanje stanja ispred vozila.",
        "Podaci se neće koristiti u druge svrhe osim ako je to propisano zakonom.",
      ],
    },
    {
      title: "Kašnjenje pri povratu",
      blocks: [
        "Dopušteno kašnjenje iznosi najviše 30 minuta.",
        `Nakon toga naplaćuje se ${km(t.lateFeePerHour)} za svaki započeti sat kašnjenja u odnosu na utvrđeno trajanje najma iz Člana 2. ovog ugovora.`,
        "Ako vozilo nije vraćeno ni nakon 30 minuta od ugovorenog termina vraćanja, a Najmodavac nije odobrio produženje najma u pisanoj formi, Najmodavac ima pravo poduzeti sve zakonom dopuštene mjere radi zaštite svoje imovine.",
      ],
    },
    {
      title: "Gubitak ključeva i dokumentacije",
      blocks: [
        "Najmoprimac snosi troškove:",
        {
          ul: [
            "izgubljenog ključa,",
            "izgubljene saobraćajne dozvole,",
            "izgubljene police osiguranja,",
            "izgubljenih registarskih oznaka,",
            "troškova izrade novih ključeva i kodiranja.",
          ],
        },
      ],
    },
    {
      title: "Čišćenje vozila",
      blocks: [
        "Najmoprimac se obavezuje vratiti vozilo čisto i uredno, u uporedivom stanju u kojem ga je preuzeo, uz uvažavanje uobičajenog zaprljanja nastalog redovnom upotrebom vozila. Ukoliko vozilo bude vraćeno u stanju koje zahtijeva dodatno pranje, čišćenje ili dubinsko čišćenje unutrašnjosti radi:",
        { ul: ["pušenja,", "prolijevanja tekućina,", "blata,", "pijeska,", "dlaka životinja,", "neugodnih mirisa,"] },
        `Najmodavac ima pravo naplatiti stvarni trošak čišćenja, a najmanje ${km(t.cleaningFee)}. Veći iznos će biti naplaćen u skladu sa tržišnom cijenom čišćenja.`,
      ],
    },
    {
      title: "Povrat vozila",
      blocks: [
        "Najmoprimac je obvezan vratiti vozilo:",
        {
          ul: [
            "na ugovorenom mjestu,",
            "u ugovoreno vrijeme,",
            "s pripadajućom opremom,",
            "s punim rezervoarom goriva,",
            "u stanju u kojem ga je preuzeo, uz uobičajeno trošenje nastalo pravilnom upotrebom.",
          ],
        },
        "Ako vozilo nije moguće pregledati pri povratu zbog vremenskih uvjeta, noćnih sati ili drugih opravdanih razloga, Najmodavac zadržava pravo izvršiti pregled u roku od 24 sata te o eventualno utvrđenim oštećenjima bez odgađanja obavijestiti Najmoprimca.",
        "Najmodavac će o utvrđenim oštećenjima sastaviti zapisnik s fotografijama ili drugom odgovarajućom dokumentacijom te ga dostaviti Najmoprimcu bez odgađanja.",
      ],
    },
    {
      title: "Odgovornost za štetu",
      blocks: [
        "Najmoprimac odgovara za svaku štetu nastalu tokom najma koja nije posljedica uobičajenog trošenja vozila.",
        "Štetom se smatra naročito:",
        {
          ul: [
            "oštećenje karoserije,",
            "oštećenje stakala,",
            "oštećenje felgi i guma,",
            "oštećenje unutrašnjosti,",
            "oštećenje motora ili mjenjača zbog nepravilnog korištenja,",
            "gubitak ili oštećenje ključeva,",
            "oštećenje dodatne opreme,",
            "oštećenje nastalo nepravilnim točenjem goriva.",
          ],
        },
        "Najmoprimac odgovara i za troškove umanjene tržišne vrijednosti vozila ako ta šteta nije pokrivena policom osiguranja.",
        "Visina štete utvrđuje se prema računu ovlaštenog servisa, procjeni ovlaštenog vještaka ili drugoj vjerodostojnoj dokumentaciji.",
      ],
    },
    {
      title: "Gorivo",
      blocks: [
        'Najmoprimac je dužan sipati isključivo gorivo odgovarajuće vrste za predmetno vozilo, prema oznakama na vozilu i uputama proizvođača. Vozilo se predaje s punim rezervoarom goriva. Najmoprimac ga vraća s punim rezervoarom. Smatra se da je ova obaveza ispunjena ukoliko je rezervoar dopunjen do prvog automatskog prekida punjenja („prvog klika") na benzinskoj stanici, najkasnije 60 minuta prije ugovorenog vremena povrata vozila. Najmoprimac je dužan na zahtjev Najmodavca predočiti račun o posljednjem točenju goriva.',
        "Najmodavac ima pravo provjeriti nivo dopunjenosti gorivom i naplatiti vrijednost nedostajućeg goriva.",
        "Najmoprimac može tražiti od Najmodavca da izvrši dopunu goriva do nivoa opisanog u stavu 1. ovog Člana. Trošak dopune snosi Najmoprimac u skladu sa računom benzinske stanice gdje je dopuna izvršena.",
        "Ako se u vozilo natoči pogrešna vrsta goriva, Najmoprimac snosi sve troškove popravka i prijevoza vozila.",
      ],
    },
    {
      title: "Zabrana otuđenja i raspolaganja",
      blocks: [
        "Najmoprimac nema pravo:",
        {
          ul: [
            "prodati vozilo,",
            "založiti vozilo,",
            "dati vozilo u podnajam,",
            "ustupiti vozilo trećoj osobi,",
            "mijenjati ili skidati registarske oznake,",
            "uklanjati GPS uređaj ili kameru,",
            "vršiti preinake na vozilu.",
          ],
        },
        "Svaka takva radnja predstavlja bitnu povredu ugovora.",
        "Najmoprimac je obavezan bez odgađanja obavijestiti Najmodavca o svakom pokušaju oduzimanja, zapljene ili privremenog zadržavanja vozila od strane trećih osoba ili nadležnih tijela.",
      ],
    },
    {
      title: "Raskid ugovora",
      blocks: [
        "Najmodavac može odmah raskinuti ugovor ako Najmoprimac:",
        {
          ul: [
            "prekrši odredbe ovog ugovora,",
            "koristi vozilo protivno zakonu,",
            "upravlja pod utjecajem alkohola ili droga,",
            "da vozilo trećoj osobi,",
            "ne plati ugovorenu cijenu najma,",
            "namjerno ošteti vozilo,",
            "koristi vozilo za krivična djela.",
          ],
        },
        "Ugovor se smatra raskinutim danom kada Najmodavac izjavu o raskidu dostavi Najmoprimcu pisanim putem, elektronskom poštom, SMS porukom ili putem aplikacija za elektronsku komunikaciju (Viber, WhatsApp i sl.), na kontakte navedene u ovom Ugovoru.",
        "U hitnim slučajevima koji ugrožavaju sigurnost vozila, imovine ili trećih osoba, naročito u slučaju upravljanja vozilom pod utjecajem alkohola ili droga, korištenja vozila za protivpravne radnje, davanja vozila neovlaštenoj osobi ili namjernog oštećenja vozila, ugovor se smatra raskinutim trenutkom kada Najmodavac usmeno ili na drugi dokaziv način saopći Najmoprimcu odluku o raskidu.",
        "Od trenutka raskida Najmoprimac je dužan bez odlaganja, a najkasnije u roku od 24 sata, vratiti vozilo na lokaciju koju odredi Najmodavac.",
        "Teret dokazivanja da je vozilo vraćeno nakon raskida ugovora snosi Najmoprimac.",
        "U slučaju raskida Najmodavac ima pravo zahtijevati trenutačan povrat vozila. Najmodavac ima pravo o trošku Najmoprimca preuzeti vozilo ako Najmoprimac, nakon raskida ugovora, ne izvrši obvezu povrata vozila.",
        "Za svaki dan zadržavanja vozila nakon raskida ugovora Najmoprimac je obvezan platiti ugovorenu dnevnu cijenu najma, kao i svaku dodatnu štetu nastalu zbog zakašnjelog povrata vozila.",
      ],
    },
    {
      title: "Viša sila",
      blocks: [
        "Najmodavac ne odgovara za nemogućnost izvršenja ugovora uzrokovanu:",
        {
          ul: [
            "prirodnim nepogodama,",
            "ratom,",
            "štrajkovima,",
            "odlukama nadležnih tijela,",
            "drugim okolnostima koje nije mogao predvidjeti niti izbjeći.",
          ],
        },
      ],
    },
    {
      title: "Zaštita ličnih podataka",
      blocks: [
        "Najmodavac obrađuje lične podatke Najmoprimca isključivo radi:",
        {
          ul: [
            "izvršenja ovog ugovora,",
            "zaštite svoje imovine,",
            "ispunjavanja zakonskih obaveza,",
            "ostvarivanja prava pred nadležnim tijelima.",
          ],
        },
        "Podaci se čuvaju i obrađuju u skladu s važećim propisima Bosne i Hercegovine o zaštiti ličnih podataka.",
        "Najmoprimac ima pravo, u skladu s važećim propisima, zatražiti pristup ličnim podacima, ispravak netačnih podataka i informacije o načinu njihove obrade. Za ostvarivanje tih prava Najmoprimac se može obratiti Najmodavcu pisanim putem.",
        "Lični podaci čuvaju se onoliko dugo koliko je potrebno radi izvršenja ugovora, zaštite prava Najmodavca i ispunjavanja zakonskih obveza.",
      ],
    },
    {
      title: "Mjerodavno pravo",
      blocks: ["Na ovaj ugovor primjenjuju se propisi Bosne i Hercegovine i Federacije Bosne i Hercegovine."],
    },
    {
      title: "Nadležnost suda",
      blocks: [
        "Ugovorne strane nastojat će sve sporove riješiti mirnim putem.",
        `Ako to nije moguće, za rješavanje sporova nadležan je stvarno nadležni sud u ${placeOf(d)}.`,
      ],
    },
    {
      title: "Završne odredbe",
      blocks: [
        "Ovaj ugovor sastavljen je u dva istovjetna primjerka. Svaka ugovorna strana zadržava po jedan primjerak.",
        "Sastavni dio ovog ugovora čine Opći uvjeti najma i Zapisnik o primopredaji putničkog vozila.",
        "Potpisom ugovora Najmoprimac potvrđuje da je:",
        {
          ul: [
            "pročitao ugovor,",
            "razumio njegove odredbe,",
            "pregledao vozilo,",
            "preuzeo vozilo u ispravnom stanju,",
            "prihvatio Opće uvjete najma.",
          ],
        },
      ],
    },
  ];
}
