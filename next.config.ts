import type { NextConfig } from "next";

// All planning data lives in the browser (localStorage). Nothing about the
// couple or their guests is sent to a server, so there is no analytics, no
// third-party script and no cache for personal pages.
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default config;
