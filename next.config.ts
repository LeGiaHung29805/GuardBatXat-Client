import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "standalone",

  allowedDevOrigins: [
    "localhost",
    "192.168.102.21",
    "127.0.0.1",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
  ],

  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || "http://127.0.0.1:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${backendUrl}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
