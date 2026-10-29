import type { NextConfig } from "next";

const communityPreview = process.env.NODE_ENV === "development" && process.env.COMMUNITY_LOCAL_PREVIEW === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: communityPreview ? ".next-community" : ".next",
  // Serve the imported Summit document before the preserved community homepage.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  // Short-lived documents; reusable static assets stay in the browser/CDN cache.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      ...["/assets/:path*", "/venue-map/vendor/:path*", "/venue-map/assets/:path*", "/style.css", "/app.js", "/event-data.js", "/event-photos.js", "/glyph-ember-preview.js", "/hero-glitch.js", "/company-logos.js"].map(source => ({ source, headers: cache })),
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
