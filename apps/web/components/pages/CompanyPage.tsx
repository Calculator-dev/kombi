import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND_IDS, brandName, type BrandId } from "@kombi/shared";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { getCompany } from "@/lib/vans";
import { BrandCounts } from "../BrandCounts";
import { Footer } from "../Footer";
import { Header } from "../Header";
import { VanCardView } from "../VanCardView";

export async function companyMetadata(slug: string, locale: Locale): Promise<Metadata> {
  const c = await getCompany(slug);
  if (!c) return {};
  const t = dict(locale).company;
  return {
    title: t.metaTitle(c.name),
    description: t.metaDescription(c.name, c.vans.length, c.location ?? ""),
    alternates: { canonical: localePath(locale, `/firma/${slug}`), languages: { bs: `/firma/${slug}`, en: `/en/firma/${slug}` } },
    openGraph: { images: c.logo ? [{ url: c.logo, width: 400, height: 400 }] : undefined },
  };
}

/** An owner's page: logo, how many vehicles of each make, and the vehicles (optionally one make only). */
export async function CompanyView({ slug, brand, locale }: { slug: string; brand?: string; locale: Locale }) {
  const c = await getCompany(slug);
  if (!c) notFound();
  const t = dict(locale).company;
  const make = BRAND_IDS.includes(brand as BrandId) ? (brand as BrandId) : undefined;
  const vans = make ? c.vans.filter((v) => v.brand === make) : c.vans;
  const base = localePath(locale, `/firma/${slug}`);
  return (
    <>
      <Header locale={locale} />
      <main id="sadrzaj">
        <section className="wrap company-head" aria-labelledby="company-h">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.logo ? <img className="company-logo" src={c.logo} alt="" width={120} height={120} /> : <span className="company-logo company-initial" aria-hidden="true">{c.name[0]}</span>}
          <div>
            <h1 id="company-h" className="display h-lg">{c.name}<span className="dot">.</span></h1>
            <p className="lead">{[c.location, t.vehicles(c.vans.length)].filter(Boolean).join(" · ")}</p>
          </div>
        </section>
        {c.brands.length > 0 && (
          <section className="wrap company-brands" aria-label={t.makes}>
            <BrandCounts brands={c.brands} href={(id) => (make === id ? base : `${base}?marka=${id}`)} active={make} />
            {make && <a className="link" href={base}>{t.all}</a>}
          </section>
        )}
        <section className="wrap company-vans" aria-label={make ? brandName(make) : t.all}>
          {vans.length ? (
            <ul className="van-grid">
              {vans.map((v, i) => <VanCardView key={v.id} van={v} list={`Firma: ${c.name}`} index={i} />)}
            </ul>
          ) : (
            <p className="placeholder-box">{t.empty}</p>
          )}
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
