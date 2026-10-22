import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, Playfair_Display, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { VibeProvider } from "@/contexts/vibe-context";
import { VibeBackground } from "@/components/VibeBackground";
import { UpgradeModalProvider } from "@/components/billing/UpgradeModal";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument-serif",
  display: "swap",
  style: ["normal", "italic"],
  weight: "400",
});

export async function generateMetadata() {
  const t = await getTranslations("App.meta");
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`dark ${inter.variable} ${playfair.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      {/* Flash-prevention: reads localStorage before first paint and sets ARCA theme attrs */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('arca.theme')||'light';var a=localStorage.getItem('arca.accent')||'clay';var dark=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-accent',a);if(dark)document.documentElement.setAttribute('data-arca-dark','true');else document.documentElement.removeAttribute('data-arca-dark');}catch(e){}})();` }} />
      <body className="bg-background text-foreground antialiased font-sans">
        <NextIntlClientProvider>
          <ThemeProvider defaultTheme="dark">
            <VibeProvider>
              <UpgradeModalProvider>
                <VibeBackground />
                {children}
                <Toaster position="bottom-right" richColors />
              </UpgradeModalProvider>
            </VibeProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
