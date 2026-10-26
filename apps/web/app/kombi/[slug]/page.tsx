import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { Contact, Faq, Prices, Rules, VanDetails } from "@/components/Sections";
import { Hero } from "@/components/Sections";
import { VanTicket } from "@/components/VanTicket";
import { getVan } from "@/lib/vans";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const van = await getVan(slug);
  if (!van) return {};
  const title = `${van.name} — najam kombija, ${van.location}`;
  const description = `${van.name} (${van.year}), ${van.seats} sjedišta, ${van.gearbox.toLowerCase()}. Od ${van.pricing.dailyRate} KM/dan. Slobodni termini i tačna cijena odmah.`;
  const image = van.photos[0];
  return {
    title,
    description,
    alternates: { canonical: `/kombi/${slug}` },
    openGraph: { title, description, images: image ? [{ url: image.url, width: image.width, height: image.height }] : undefined },
  };
}

export default async function VanPage({ params }: Props) {
  const { slug } = await params;
  const van = await getVan(slug);
  if (!van) notFound();
  return (
    <>
      <Header />
      <main id="sadrzaj">
        <Hero
          title={
            <>
              {van.name}
              <span className="dot">.</span>
            </>
          }
          intro={van.description.split("\n")[0] || `${van.seats} sjedišta, ${van.gearbox.toLowerCase()}, bez vozača. Odaberite datume i cijenu vidite odmah.`}
          specs={[
            ["Grad", van.location],
            ["Od", `${van.pricing.dailyRate} KM / dan`],
            ["Sjedišta", String(van.seats)],
            ["Mjenjač", van.gearbox],
            ["Plaćanje", "Pri preuzimanju"],
          ]}
        >
          <Suspense>
            <VanTicket van={{ id: van.id, slug: van.slug, pricing: van.pricing }} />
          </Suspense>
        </Hero>
        <VanDetails van={van} />
        <Prices settings={van.pricing} included={van.terms.included} />
        <Rules terms={van.terms} settings={van.pricing} />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <JsonLd path={`/kombi/${van.slug}`} van={van} />
    </>
  );
}
