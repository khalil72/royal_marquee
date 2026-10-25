import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" badge shown in development
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Pages render on the client from localStorage, so they can never satisfy
    // instant-navigation validation; only validate segments that opt in.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
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
