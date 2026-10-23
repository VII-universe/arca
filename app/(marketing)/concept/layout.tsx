import type { Metadata } from "next";
import { Bodoni_Moda, Geist_Mono, Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "@/components/marketing/concept/concept.css";

// M0 concept board — internal review only (concept-v2 branch, never merged).
export const metadata: Metadata = {
  title: "ARCA v2 — koncept M0",
  robots: { index: false, follow: false },
};

const newsreader = Newsreader({ subsets: ["latin", "latin-ext"], axes: ["opsz"], style: ["normal", "italic"], variable: "--cx-newsreader", display: "swap" });
const bodoni = Bodoni_Moda({ subsets: ["latin", "latin-ext"], axes: ["opsz"], style: ["normal", "italic"], variable: "--cx-bodoni", display: "swap" });
const inter = Inter({ subsets: ["latin", "latin-ext"], axes: ["opsz"], variable: "--cx-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--cx-jetbrains", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--cx-geist-mono", display: "swap" });

export default function ConceptLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`cx ${newsreader.variable} ${bodoni.variable} ${inter.variable} ${jetbrains.variable} ${geistMono.variable}`}>
      {children}
    </div>
  );
}
