import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/contact",
        destination: "https://www.kevalsound.com/contact",
        permanent: true,
      },
      {
        source: "/legal/:document*",
        destination: "https://www.kevalsound.com/legal/:document*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
