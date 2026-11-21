import type { NextConfig } from "next";

// Application personnelle derrière authentification : tout est rendu
// dynamiquement, on n'active donc pas Cache Components.
const nextConfig: NextConfig = {
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
