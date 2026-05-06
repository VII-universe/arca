import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { VibeProvider } from "@/contexts/vibe-context";
import { VibeBackground } from "@/components/VibeBackground";
import { UpgradeModalProvider } from "@/components/billing/UpgradeModal";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ARCA — Your words, preserved with care.",
  description:
    "A secure vault for time capsules and legacy messages — delivered precisely when they're needed most.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased font-sans">
        <ThemeProvider defaultTheme="dark">
          <VibeProvider>
            <UpgradeModalProvider>
              <VibeBackground />
              {children}
              <Toaster position="bottom-right" richColors />
            </UpgradeModalProvider>
          </VibeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
