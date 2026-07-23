import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile lives in $HOME).
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Product photography will be served from Cloudinary in a later phase.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Local backend-served product images (Express on :5001).
      { protocol: "http", hostname: "127.0.0.1", port: "5001" },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    // Proxy API + uploads to the Express backend (running on port 5001).
    const API_ORIGIN = process.env.BACKEND_ORIGIN || "http://127.0.0.1:5001";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
