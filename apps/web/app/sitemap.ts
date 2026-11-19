import type { MetadataRoute } from "next";
import { LANDINGS, SITE } from "@/lib/site";
import { getVans } from "@/lib/vans";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vans = await getVans();
  // Each page in Bosnian and in English, telling search engines they belong together.
  const both = (path: string, changeFrequency: "daily" | "weekly" | "yearly", priority: number): MetadataRoute.Sitemap => {
    const bs = `${SITE.url}${path === "/" ? "" : path}`;
    const en = `${SITE.url}/en${path === "/" ? "" : path}`;
    const alternates = { languages: { bs, en } };
    return [
      { url: bs, changeFrequency, priority, alternates },
      { url: en, changeFrequency, priority: Math.round(priority * 8) / 10, alternates },
    ];
  };
  return [
    ...both("/", "daily", 1),
    ...both("/kombiji", "daily", 0.9),
    ...both("/privatnost", "yearly", 0.2),
    ...both("/kolacici", "yearly", 0.2),
    ...vans.flatMap((v) => both(`/kombi/${v.slug}`, "weekly", 0.9)),
    ...Object.keys(LANDINGS).map((slug) => ({
      url: `${SITE.url}/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
