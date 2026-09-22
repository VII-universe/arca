import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Fix: Turbopack picked up a parent lockfile and tried to scan /Downloads.
    // Pin the root explicitly to this project directory.
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      // Default is 1MB — avatar/cover uploads validate up to 5MB and the
      // vibe background upload up to 10MB, so real photos were rejected
      // by this limit before that validation ever ran (413, surfaced to
      // the client as "An unexpected response was received from the
      // server."). Match the largest of those limits.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
