import type { MetadataRoute } from "next";

// Crawl the public Summit pages; keep crawlers out of the members-only community and the APIs.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/admin", "/members", "/member", "/connections", "/messages", "/profile", "/settings", "/unsubscribe"],
    },
    sitemap: "https://82startup.com/sitemap.xml",
    host: "https://82startup.com",
  };
}
