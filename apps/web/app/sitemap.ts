import type { MetadataRoute } from "next";
import { LANDINGS, SITE } from "@/lib/site";
import { getVans } from "@/lib/vans";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vans = await getVans();
  return [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/kombiji`, changeFrequency: "daily", priority: 0.9 },
    ...vans.map((v) => ({ url: `${SITE.url}/kombi/${v.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...Object.keys(LANDINGS).map((slug) => ({
      url: `${SITE.url}/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
