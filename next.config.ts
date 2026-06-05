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
    // Allow the Job Spec Creator to be embedded via <iframe> on the Aaron
    // Wallis website. Add/adjust domains here if embedding elsewhere.
    return [
      {
        source: "/job-spec",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://aaronwallis.co.uk https://*.aaronwallis.co.uk",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
