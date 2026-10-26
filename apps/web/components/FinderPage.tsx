import { Suspense, type ReactNode } from "react";
import type { VanCard } from "@kombi/shared";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { JsonLd } from "./JsonLd";
import { SearchTicket } from "./SearchTicket";
import { Hero, PageBody } from "./Sections";
import { VanGrid } from "./VanGrid";

/** Homepage and landing pages: pick dates, see which vans are free and what they cost. */
export function FinderPage({ title, intro, vans, path = "/" }: { title: ReactNode; intro: string; vans: VanCard[]; path?: string }) {
  const from = vans.length ? Math.min(...vans.map((v) => v.dailyRate)) : null;
  const cities = [...new Set(vans.map((v) => v.location))];
  return (
    <>
      <Header />
      <main id="sadrzaj">
        <Hero
          title={title}
          intro={intro}
          specs={[
            ["Kombija", String(vans.length || "—")],
            ["Od", from ? `${from} KM / dan` : "—"],
            ["Gradovi", cities.join(", ") || "—"],
            ["Preuzimanje", "Po dogovoru"],
            ["Plaćanje", "Pri preuzimanju"],
          ]}
        >
          <Suspense>
            <SearchTicket />
          </Suspense>
        </Hero>
        <Suspense>
          <VanGrid initial={vans} />
        </Suspense>
        <PageBody />
      </main>
      <Footer />
      <JsonLd path={path} fromPrice={from} />
    </>
  );
}
