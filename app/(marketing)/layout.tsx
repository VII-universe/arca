import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist_Mono, Inter, Newsreader } from "next/font/google";
import { getLocale } from "next-intl/server";
import { SITE_URL } from "@/lib/site-url";
import "@/components/marketing/cosmos/cosmos.css";
import "@/components/marketing/landing/landing.css";

// Root layout of the public landing ("/", "/en", "/cs"). Separate from the
// app's (app/(app)/layout.tsx): only fonts, the sky and i18n — no app
// providers, no app stylesheet, no Sentry (see instrumentation-client.ts).
// The scene (components/marketing/cosmos) sits fixed behind the content.
// i18n is resolved on the server; client components get their copy as props,
// so no message catalogue or formatter ships to the browser. Moving between
// the landing and the app is a full page load.

const display = Newsreader({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  variable: "--font-sans",
  display: "swap",
  // Only the headline's face is preloaded (it is the LCP); the others swap in, so the Earth's still isn't kept waiting.
  preload: false,
});

const mono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default async function MarketingRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="l-body">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
