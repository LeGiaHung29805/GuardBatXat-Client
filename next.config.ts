import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  allowedDevOrigins: [
    "localhost",
    "192.168.102.21",
    "127.0.0.1",
    "rounding-slate-brisket.ngrok-free.dev",
  ],
};

export default nextConfig;