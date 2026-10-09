import type { NextConfig } from "next";

const isGithubPages = process.env.EXPORT_GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/Dr.Tech.Care-",
        assetPrefix: "/Dr.Tech.Care-/",
        images: {
          unoptimized: true,
        },
      }
    : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  allowedDevOrigins: [
    "192.168.1.101",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
