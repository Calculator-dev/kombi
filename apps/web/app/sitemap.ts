import type { MetadataRoute } from "next";
import { LANDINGS, SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "weekly", priority: 1 },
    ...Object.keys(LANDINGS).map((slug) => ({
      url: `${SITE.url}/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
