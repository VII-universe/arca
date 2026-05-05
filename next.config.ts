import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Fix: Turbopack picked up a parent lockfile and tried to scan /Downloads.
    // Pin the root explicitly to this project directory.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
