import type { PublicVan } from "@kombi/shared";
import { dict, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const FUEL: Record<string, string> = { Dizel: "Diesel", Benzin: "Gasoline", Hibrid: "Hybrid", Električni: "Electric" };

/** Structured data so Google can show the business, prices and FAQ in results. */
export function JsonLd({ path = "/", fromPrice, van, locale = "bs" }: { path?: string; fromPrice?: number | null; van?: PublicVan; locale?: Locale }) {
  const en = locale === "en";
  const price = (van ? (van.pricing.priceOnRequest ? undefined : van.pricing.dailyRate) : fromPrice) ?? undefined;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "AutoRental",
      "@id": `${SITE.url}/#business`,
      name: SITE.name,
      url: SITE.url,
      priceRange: price ? (en ? `from ${price} KM/day` : `od ${price} KM/dan`) : undefined,
      currenciesAccepted: "BAM, EUR",
      areaServed: [en ? "Bosnia and Herzegovina" : "Bosna i Hercegovina"],
      address: { "@type": "PostalAddress", addressLocality: SITE.city, addressCountry: "BA" },
      makesOffer: van
        ? {
            "@type": "Offer",
            priceCurrency: "BAM",
            price,
            url: `${SITE.url}${path}`,
            itemOffered: {
              "@type": "Car",
              name: `${van.name} ${van.year}`,
              image: van.photos[0]?.url,
              vehicleSeatingCapacity: van.seats,
              fuelType: FUEL[van.fuel],
              vehicleTransmission: van.gearbox === "Automatski" ? "Automatic" : "Manual",
              vehicleModelDate: String(van.year),
              // Ratings from customers with a finished rental (shown on the page too).
              aggregateRating: van.reviews?.count
                ? { "@type": "AggregateRating", ratingValue: van.reviews.average, reviewCount: van.reviews.count, bestRating: 5, worstRating: 1 }
                : undefined,
            },
          }
        : undefined,
    },
    // The questions are shown only on a van's page, so only that page describes them.
    van
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: dict(locale).faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }
      : null,
  ].filter(Boolean);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
