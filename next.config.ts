import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  allowedDevOrigins: ["localhost", "192.168.102.21", "127.0.0.1"]
};

export default nextConfig;
