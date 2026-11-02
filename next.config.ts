import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";
const nextConfig: NextConfig = {
  ...(githubPages
    ? {
        output: "export",
        basePath: "/justashoppingcart",
        trailingSlash: true,
        pageExtensions: ["tsx"],
        images: { unoptimized: true },
      }
    : {}),
  env: {
    NEXT_PUBLIC_STATIC_HOST: githubPages ? "true" : "false",
    NEXT_PUBLIC_BASE_PATH: githubPages ? "/justashoppingcart" : "",
  },
  /* config options here */
  cacheComponents: !githubPages,
  partialPrefetching: !githubPages,
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
