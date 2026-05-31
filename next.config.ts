import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.aaronwallis.co.uk",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/commute',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
