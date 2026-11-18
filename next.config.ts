
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],

  experimental: {
    agentFeedback: true,
  },

  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    root: process.cwd(),

    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
