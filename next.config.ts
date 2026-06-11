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
    // Allow these tools to be embedded via <iframe> on the Aaron Wallis site.
    // X-Robots-Tag: noindex keeps the Render-hosted tool URLs out of search so
    // the branded aaronwallis.co.uk landing pages are the canonical results.
    return [
      {
        source: "/commute",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/job-spec",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
