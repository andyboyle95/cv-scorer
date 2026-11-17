import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  // Serves the Red Letter app (english-marking/) under /redletter on this domain.
  // Set REDLETTER_ORIGIN to its Render URL, e.g. https://redletter.onrender.com
  async rewrites() {
    const origin = process.env.REDLETTER_ORIGIN;
    if (!origin) return [];
    return [
      { source: "/redletter", destination: `${origin}/redletter` },
      { source: "/redletter/:path*", destination: `${origin}/redletter/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.aaronwallis.co.uk",
      },
    ],
  },
};

export default nextConfig;
