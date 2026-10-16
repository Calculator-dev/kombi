import path from "node:path";
import type { NextConfig } from "next";

// The Node API runs separately; the website forwards /api/* to it so the
// browser only ever talks to one origin (admin cookies stay first-party).
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@kombi/shared"],
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default config;
