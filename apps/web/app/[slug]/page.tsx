import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FinderPage } from "@/components/FinderPage";
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
  return (
    <FinderPage
      vans={await getVans()}
      path={`/${slug}`}
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
