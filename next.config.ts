import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Required for Dockerfile `.next/standalone` copy */
  output: "standalone",
};

export default nextConfig;
