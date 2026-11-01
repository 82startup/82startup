import type { MetadataRoute } from "next";

// The five public Summit pages, at their canonical URLs (the same ones their <link rel="canonical"> names).
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://82startup.com";
  const pages: [string, number][] = [["/", 1], ["/schedule.html", 0.9], ["/tickets.html", 0.9], ["/speakers.html", 0.8], ["/venue.html", 0.8]];
  return pages.map(([path, priority]) => ({ url: `${origin}${path}`, changeFrequency: "weekly", priority }));
}
