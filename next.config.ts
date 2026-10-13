import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

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
  images: {
    remotePatterns: [
      {
        // Supabase Storage signed URLs for avatars/covers/memories/message
        // media (recipient-avatars, memories, arca-media buckets). Scoped
        // to the storage object path, not the whole supabase.co domain.
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        // GIF picker previews (components/arca/GifPicker.tsx) — served
        // `unoptimized` there anyway (see that file for why), but still
        // needs to be allow-listed for next/image to load them at all.
        protocol: "https",
        hostname: "*.giphy.com",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "vii-universe",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
