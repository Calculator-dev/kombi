import type { Settings } from "@kombi/shared";
import { FAQ, SITE, VAN } from "@/lib/site";

/** Structured data so Google can show the business, price and FAQ in results. */
export function JsonLd({ settings, path = "/" }: { settings: Settings; path?: string }) {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "AutoRental",
      "@id": `${SITE.url}/#business`,
      name: SITE.name,
      url: SITE.url,
      telephone: SITE.phone.startsWith("[") ? undefined : SITE.phone,
      priceRange: `od ${settings.dailyRate} KM/dan`,
      currenciesAccepted: "BAM, EUR",
      areaServed: ["Sarajevo", "Bosna i Hercegovina"],
      address: { "@type": "PostalAddress", addressLocality: "Sarajevo", addressCountry: "BA" },
      geo: { "@type": "GeoCoordinates", latitude: 43.8563, longitude: 18.4131 },
      makesOffer: {
        "@type": "Offer",
        priceCurrency: "BAM",
        price: settings.dailyRate,
        url: `${SITE.url}${path}`,
        itemOffered: {
          "@type": "Car",
          name: `${VAN.name} ${VAN.year}`,
          brand: { "@type": "Brand", name: "Toyota" },
          vehicleSeatingCapacity: VAN.seats,
          fuelType: "Diesel",
          vehicleTransmission: "Manual",
          vehicleModelDate: String(VAN.year),
        },
      },
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
