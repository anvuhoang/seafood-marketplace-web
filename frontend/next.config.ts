import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Older short URLs; each page has a single canonical route. Query strings
  // such as ?redirect= are passed through. Temporary (307) while routes settle.
  async redirects() {
    return [
      { source: "/login", destination: "/customer/login", permanent: false },
      { source: "/register", destination: "/customer/register", permanent: false },
      { source: "/customer/products/:id", destination: "/products/:id", permanent: false },
    ];
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
