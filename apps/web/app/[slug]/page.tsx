import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FinderPage } from "@/components/FinderPage";
import { LandingGuide } from "@/components/LandingGuide";
import { LANDINGS } from "@/lib/site";
import { getVans } from "@/lib/vans";

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
  const vans = (await getVans()).filter((v) => (!page.category || v.category === page.category) && v.seats >= (page.minSeats ?? 0));
  return (
    <FinderPage
      vans={vans}
      guide={<LandingGuide page={page} vans={vans} />}
      path={`/${slug}`}
      category={page.category}
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
  );
}
