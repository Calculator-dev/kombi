import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { Hero, PageBody } from "@/components/Sections";
import { getSettings } from "@/lib/settings";
import { LANDINGS } from "@/lib/site";

export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(LANDINGS).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = LANDINGS[(await params).slug];
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${(await params).slug}` },
    openGraph: { title: page.title, description: page.description },
  };
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params;
  const page = LANDINGS[slug];
  if (!page) notFound();
  const settings = await getSettings();
  return (
    <>
      <Header />
      <main id="sadrzaj">
        <Hero
          settings={settings}
          intro={page.intro}
          title={
            <>
              {page.h1[0]}
              <br />
              {page.h1[1]}
              <span className="dot">.</span>
            </>
          }
        />
        <PageBody settings={settings} />
      </main>
      <Footer />
      <JsonLd settings={settings} path={`/${slug}`} />
    </>
  );
}
