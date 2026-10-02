import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root: __dirname },
  // Dev only: lets a phone on the same Wi-Fi load the app for testing.
  allowedDevOrigins: ["192.168.0.*", "10.0.0.*", "localhost"],
};

export default nextConfig;
