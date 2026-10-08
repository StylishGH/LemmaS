import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_API_URL ||
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : null);

    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/api/py/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
