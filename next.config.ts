import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve the imported Summit document before the preserved community homepage.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
      afterFiles: [],
      fallback: [],
    };
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
