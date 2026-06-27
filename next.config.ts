import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  allowedDevOrigins: [
    "localhost",
    "192.168.102.21",
    "127.0.0.1",
    "rounding-slate-brisket.ngrok-free.dev",
  ],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8080/api/:path*",
      },
      {
        source: "/ws/:path*",
        destination: "http://127.0.0.1:8080/ws/:path*",
      },
    ];
  },
};

export default nextConfig;