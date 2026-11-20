import { Suspense, type ReactNode } from "react";
import type { Category, VanCard } from "@kombi/shared";
import { dict, type Locale } from "@/lib/i18n";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { JsonLd } from "./JsonLd";
import { SearchBox } from "./SearchBox";
import { SearchTicket } from "./SearchTicket";
import { Hero, PageBody } from "./Sections";
import { VanGrid } from "./VanGrid";

/** Homepage and landing pages: pick dates, see which vans are free and what they cost. */
export function FinderPage({
  title,
  intro,
  vans,
  path = "/",
  locale = "bs",
  category,
  guide,
}: {
  title: ReactNode;
  intro: string | readonly string[];
  vans: VanCard[];
  path?: string;
  locale?: Locale;
  /** A landing page for one type of van. */
  category?: Category;
  /** A landing page's own content, shown after the vehicles. */
  guide?: ReactNode;
}) {
  const t = dict(locale).home;
  const priced = vans.filter((v) => !v.priceOnRequest);
  const from = priced.length ? Math.min(...priced.map((v) => v.dailyRate)) : null;
  const cities = [...new Set(vans.map((v) => v.location))];
  return (
    <>
      <Header locale={locale} />
      <main id="sadrzaj">
        <Hero
          title={title}
          intro={intro}
          search={<SearchBox locale={locale} />}
          specs={[
            [t.specVans, String(vans.length || "—")],
            [t.specFrom, from ? t.kmPerDay(from) : "—"],
            [t.specCities, cities.join(", ") || "—"],
            [t.specPickup, t.specPickupValue],
            [t.specPayment, t.specPaymentValue],
          ]}
        >
          <Suspense>
            <SearchTicket category={category} />
          </Suspense>
        </Hero>
        <VanGrid vans={vans} locale={locale} category={category} />
        {guide}
        <PageBody locale={locale} />
      </main>
      <Footer locale={locale} />
      <JsonLd path={path} fromPrice={from} locale={locale} />
    </>
  );
}
