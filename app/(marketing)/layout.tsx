import "@/components/marketing/marketing.css";

// Marketing route group ("/", "/en", "/cs") — URLs are unaffected by the
// group; this only scopes the marketing stylesheet to these pages.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
