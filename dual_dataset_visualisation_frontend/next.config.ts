import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "standalone",
  devIndicators: false,
  async redirects() {
    return [
      {
        source: '/datasets',
        destination: '/',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
