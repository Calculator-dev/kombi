import type { PublicVan } from "@kombi/shared";
import { FAQ, SITE } from "@/lib/site";

const FUEL: Record<string, string> = { Dizel: "Diesel", Benzin: "Gasoline", Hibrid: "Hybrid", Električni: "Electric" };

/** Structured data so Google can show the business, prices and FAQ in results. */
export function JsonLd({ path = "/", fromPrice, van }: { path?: string; fromPrice?: number | null; van?: PublicVan }) {
  const price = van?.pricing.dailyRate ?? fromPrice ?? undefined;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "AutoRental",
      "@id": `${SITE.url}/#business`,
      name: SITE.name,
      url: SITE.url,
      telephone: SITE.phone.startsWith("[") ? undefined : SITE.phone,
      priceRange: price ? `od ${price} KM/dan` : undefined,
      currenciesAccepted: "BAM, EUR",
      areaServed: ["Bosna i Hercegovina"],
      address: { "@type": "PostalAddress", addressLocality: SITE.city, addressCountry: "BA" },
      makesOffer: van
        ? {
            "@type": "Offer",
            priceCurrency: "BAM",
            price: van.pricing.dailyRate,
            url: `${SITE.url}${path}`,
            itemOffered: {
              "@type": "Car",
              name: `${van.name} ${van.year}`,
              image: van.photos[0]?.url,
              vehicleSeatingCapacity: van.seats,
              fuelType: FUEL[van.fuel],
              vehicleTransmission: van.gearbox === "Automatski" ? "Automatic" : "Manual",
              vehicleModelDate: String(van.year),
            },
          }
        : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
