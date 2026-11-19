import { FinderPage } from "@/components/FinderPage";
import { dict } from "@/lib/i18n";
import { getVans } from "@/lib/vans";

export const revalidate = 60;

export const metadata = { alternates: { canonical: "/", languages: { bs: "/", en: "/en" } } };

export default async function HomePage() {
  const t = dict("bs").home;
  return (
    <FinderPage
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
  );
}
