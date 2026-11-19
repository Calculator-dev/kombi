import type { Metadata } from "next";
import { FinderPage } from "@/components/FinderPage";
import { dict } from "@/lib/i18n";
import { getVans } from "@/lib/vans";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Van rental in Bosnia and Herzegovina — free vans and prices instantly | kombi.ba" },
  description:
    "Rent a van for 8 or 9 people, self-drive. Pick your dates and instantly see available vans and the exact price. Pay at pickup.",
  alternates: { canonical: "/en", languages: { bs: "/", en: "/en" } },
  openGraph: { type: "website", locale: "en_US", siteName: "kombi.ba" },
};

export default async function HomePage() {
  const t = dict("en").home;
  return (
    <div lang="en">
      <FinderPage
        locale="en"
        path="/en"
        vans={await getVans()}
        title={
          <>
            {t.title[0]}
            <br />
            {t.title[1]}
            <span className="dot">.</span>
          </>
        }
        intro={t.intro}
      />
    </div>
  );
}
