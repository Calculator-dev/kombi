import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { getVan } from "@/lib/vans";
import { Footer } from "../Footer";
import { Gallery } from "../Gallery";
import { Header } from "../Header";
import { JsonLd } from "../JsonLd";
import { Contact, Faq, Hero, Prices, Reviews, Rules, VanDetails } from "../Sections";
import { VanTicket } from "../VanTicket";

export async function vanMetadata(slug: string, locale: Locale): Promise<Metadata> {
  const van = await getVan(slug);
  if (!van) return {};
  const d = dict(locale);
  const t = d.van;
  const gearbox = (d.gearboxes[van.gearbox] ?? van.gearbox).toLowerCase();
  const title = van.category === "car" ? d.car.metaTitle(van.name, van.location) : t.metaTitle(van.name, van.location);
  const description = van.pricing.priceOnRequest
    ? t.metaOnRequest(van.name, van.year, van.seats, gearbox)
    : t.metaPriced(van.name, van.year, van.seats, gearbox, van.pricing.dailyRate);
  const image = van.photos[0];
  return {
    title,
    description,
    alternates: {
      canonical: localePath(locale, `/kombi/${slug}`),
      languages: { bs: `/kombi/${slug}`, en: `/en/kombi/${slug}` },
    },
    openGraph: {
      title,
      description,
      locale: locale === "en" ? "en_US" : "bs_BA",
      images: image ? [{ url: image.url, width: image.width, height: image.height }] : undefined,
    },
  };
}

/** A van's page: photos, calendar with price, details, prices and terms. */
export async function VanPage({ slug, locale }: { slug: string; locale: Locale }) {
  const van = await getVan(slug);
  if (!van) notFound();
  const d = dict(locale);
  const t = d.van;
  const onRequest = van.pricing.priceOnRequest;
  const gearbox = d.gearboxes[van.gearbox] ?? van.gearbox;
  return (
    <>
      <Header locale={locale} />
      <main id="sadrzaj">
        <Hero
          title={
            <>
              {van.name}
              <span className="dot">.</span>
            </>
          }
          intro={
            (locale === "bs" && van.description.split("\n")[0]) ||
            (van.category === "cargo"
              ? d.cargo.intro(gearbox.toLowerCase(), onRequest)
              : van.category === "car"
                ? d.car.intro(van.seats, gearbox.toLowerCase(), onRequest)
                : t.intro(van.seats, gearbox.toLowerCase(), onRequest))
          }
          media={van.photos.length > 0 && <Gallery photos={van.photos} name={van.name} spin={van.spin} />}
          specs={[
            [t.city, van.location],
            onRequest ? [t.price, d.onRequest] : [t.from, d.home.kmPerDay(van.pricing.dailyRate)],
            van.category === "cargo" && van.cargoM3 ? [d.cargo.space, d.cargo.m3(van.cargoM3)] : [t.seats, String(van.seats)],
            [t.gearbox, gearbox],
            [d.owner.label, van.owner || d.owner.platform],
            ...(van.reviews?.count ? [[d.reviews.title.join(" "), `★ ${van.reviews.average} (${van.reviews.count})`] as [string, string]] : []),
            [t.payment, t.paymentValue],
          ]}
        >
          <Suspense>
            <VanTicket
              van={{ id: van.id, slug: van.slug, name: van.name, seats: van.seats, location: van.location, dailyRate: van.pricing.dailyRate, pricing: van.pricing }}
            />
          </Suspense>
        </Hero>
        <VanDetails van={van} locale={locale} />
        <Prices settings={van.pricing} included={van.terms.included} vat={van.vat} locale={locale} />
        <Rules terms={van.terms} settings={van.pricing} limits={van.limits} locale={locale} />
        <Reviews reviews={van.reviews} locale={locale} />
        <Faq locale={locale} />
        <Contact locale={locale} />
      </main>
      <Footer locale={locale} />
      <JsonLd path={localePath(locale, `/kombi/${van.slug}`)} van={van} locale={locale} />
    </>
  );
}
