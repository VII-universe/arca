import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Layers,
  Check,
  ArrowRight,
  Infinity as InfinityIcon,
  Lock,
  Mic,
  Mail,
  Sparkles,
  Clock,
  Eye,
  FileText,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export async function generateMetadata() {
  const t = await getTranslations("Landing.meta");
  return { title: t("title"), description: t("description") };
}

// ─── Data — visual metadata only, text comes from Landing.* translations ──────
// Each array is index-matched to the corresponding translations array (see
// messages/{locale}.json → Landing.*), pulled at render time via t.raw().

const FEATURE_STYLES = [
  { icon: <ShieldCheck className="size-5" />, color: "text-emerald-400", border: "border-emerald-500/15", bg: "bg-emerald-500/[0.08]", shadow: "hover:shadow-emerald-500/10" },
  { icon: <Users className="size-5" />, color: "text-violet-400", border: "border-violet-500/15", bg: "bg-violet-500/[0.08]", shadow: "hover:shadow-violet-500/10" },
  { icon: <Layers className="size-5" />, color: "text-sky-400", border: "border-sky-500/15", bg: "bg-sky-500/[0.08]", shadow: "hover:shadow-sky-500/10" },
];

const HOW_STEP_ICONS = [
  <FileText key="0" className="size-4" />,
  <Clock key="1" className="size-4" />,
  <Eye key="2" className="size-4" />,
  <Mail key="3" className="size-4" />,
];

type FeatureText = { title: string; body: string; pills: string[] };
type StepText = { title: string; body: string };
type SecurityCardRow = { label: string; value: string };
type ProFeature = { text: string; highlight: boolean };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const t = await getTranslations("Landing");

  const features = t.raw("features.items") as FeatureText[];
  const steps = t.raw("howItWorks.steps") as StepText[];
  const securityItems = t.raw("security.items") as string[];
  const securityRows = t.raw("security.cardRows") as SecurityCardRow[];
  const freeFeatures = t.raw("pricing.free.features") as string[];
  const proFeatures = t.raw("pricing.pro.features") as ProFeature[];

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/75 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">

          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.22em] uppercase text-foreground"
          >
            ARCA
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[
              ["#features", t("nav.features")],
              ["#security", t("nav.security")],
              ["#pricing", t("nav.pricing")],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
                "bg-foreground text-background hover:opacity-85",
                "shadow-lg shadow-black/20"
              )}
            >
              {t("nav.cta")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-24 pb-28 md:pt-36 md:pb-40 text-center">

          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-violet-600/10 blur-[120px]" />
            <div className="absolute left-1/4 top-1/3 h-[300px] w-[400px] rounded-full bg-sky-600/[0.08] blur-[100px]" />
            <div className="absolute right-1/4 bottom-0 h-[250px] w-[350px] rounded-full bg-emerald-600/[0.08] blur-[100px]" />
          </div>

          <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-1000">

            {/* Eyebrow pill */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/[0.08] px-4 py-1.5">
              <Sparkles className="size-3 text-violet-400" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-violet-300">
                {t("hero.eyebrow")}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.08] tracking-tight text-foreground">
              {t("hero.titleLine1")}{" "}
              <br className="hidden sm:block" />
              <span className="italic text-muted-foreground">{t("hero.titleItalic")}</span>{" "}
              {t("hero.titleLine2")}
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-7 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
              {t("hero.subheadline")}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-200",
                  "bg-foreground text-background hover:opacity-85",
                  "shadow-xl shadow-black/25"
                )}
              >
                {t("hero.ctaPrimary")}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>

            {/* Trust strip */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/40">
              <span className="flex items-center gap-1.5"><Lock className="size-3" /> {t("hero.trustEncrypted")}</span>
              <span className="opacity-30">·</span>
              <span>{t("hero.trustFree")}</span>
              <span className="opacity-30">·</span>
              <span>{t("hero.trustNoCard")}</span>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1.5"><Mic className="size-3" /> {t("hero.trustVoice")}</span>
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────── */}
        <section id="how-it-works" className="border-t border-border/40 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-6xl">

            <SectionLabel>{t("howItWorks.label")}</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
              {t("howItWorks.titlePlain")}{" "}
              <span className="italic text-muted-foreground">{t("howItWorks.titleItalic")}</span>
            </h2>

            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-muted-foreground/60">
                      {HOW_STEP_ICONS[i]}
                    </span>
                    <div className="h-px flex-1 bg-border/40" />
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground/25">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-medium text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section id="features" className="border-t border-border/40 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-6xl">

            <SectionLabel>{t("features.label")}</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
              {t("features.titlePlain")}{" "}
              <span className="italic text-muted-foreground">{t("features.titleItalic")}</span>
            </h2>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
              {features.map((f, i) => {
                const style = FEATURE_STYLES[i];
                return (
                  <div
                    key={f.title}
                    className={cn(
                      "group relative rounded-3xl border p-7 transition-all duration-300",
                      "bg-card/40 backdrop-blur-sm",
                      "hover:shadow-xl hover:-translate-y-0.5",
                      style.border,
                      style.shadow
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "mb-5 inline-flex size-10 items-center justify-center rounded-2xl border",
                      style.bg, style.border, style.color
                    )}>
                      {style.icon}
                    </div>

                    <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {f.body}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {f.pills.map((p) => (
                        <span
                          key={p}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide",
                            style.border, style.color
                          )}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Security deep-dive ──────────────────────────────────────── */}
        <section id="security" className="border-t border-border/40 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Text */}
              <div className="space-y-6">
                <SectionLabel>{t("security.label")}</SectionLabel>
                <h2 className="font-serif text-3xl md:text-4xl text-foreground leading-snug">
                  {t("security.titlePlain")}{" "}
                  <span className="italic text-muted-foreground">{t("security.titleItalic")}</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {t("security.body")}
                </p>
                <ul className="space-y-3">
                  {securityItems.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span className="size-4 shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                        <Check className="size-2.5 text-emerald-400" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vault card */}
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl blur-2xl" />
                <div className="relative rounded-3xl border border-emerald-500/15 bg-card/60 backdrop-blur-md p-8 space-y-1">
                  {/* Fake window chrome */}
                  <div className="flex items-center gap-2 mb-5">
                    <span className="size-2.5 rounded-full bg-rose-400/60" />
                    <span className="size-2.5 rounded-full bg-amber-400/60" />
                    <span className="size-2.5 rounded-full bg-emerald-400/60" />
                    <span className="ml-2 text-[10px] font-mono text-muted-foreground/30">{t("security.cardPath")}</span>
                  </div>

                  {securityRows.map((row, i) => {
                    const rowColors = ["text-emerald-400", "text-sky-400", "text-violet-400", "text-amber-400", "text-rose-400", "text-muted-foreground"];
                    return (
                      <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                        <span className="text-xs text-muted-foreground/50 font-mono">{row.label}</span>
                        <span className={cn("text-xs font-semibold font-mono", rowColors[i])}>{row.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <section id="pricing" className="border-t border-border/40 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-6xl">

            <SectionLabel>{t("pricing.label")}</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
              {t("pricing.title")}
            </h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-md">
              {t("pricing.subtitle")}
            </p>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">

              {/* Free */}
              <div className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-sm p-8 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {t("pricing.free.tier")}
                  </p>
                  <p className="text-4xl font-semibold text-foreground">{t("pricing.free.price")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("pricing.free.period")}</p>
                </div>

                <ul className="space-y-2.5">
                  {freeFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span className="size-4 shrink-0 rounded-full border border-border/60 flex items-center justify-center">
                        <Check className="size-2.5 text-muted-foreground/50" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className="block w-full rounded-xl border border-border/60 bg-muted/20 py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-200"
                >
                  {t("pricing.free.cta")}
                </Link>
              </div>

              {/* Pro */}
              <div className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-zinc-950/60 backdrop-blur-sm p-8 space-y-6 overflow-hidden shadow-2xl shadow-violet-950/30">

                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-56 rounded-full bg-violet-600/20 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                      {t("pricing.pro.tier")}
                    </p>
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      {t("pricing.pro.badge")}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-4xl font-semibold text-white">{t("pricing.pro.price")}</p>
                    <p className="text-sm text-muted-foreground">{t("pricing.pro.period")}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("pricing.pro.altPricePrefix")}{" "}
                    <span className="font-semibold text-violet-300">{t("pricing.pro.altPriceAmount")}</span>
                    {" "}{t("pricing.pro.altPriceSuffix")}
                  </p>
                </div>

                <ul className="relative space-y-2.5">
                  {proFeatures.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5 text-sm">
                      <span className={cn(
                        "size-4 shrink-0 rounded-full flex items-center justify-center border",
                        f.highlight
                          ? "bg-violet-500/20 border-violet-500/30 text-violet-400"
                          : "border-border/50 text-muted-foreground/50"
                      )}>
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                      <span className={f.highlight ? "text-zinc-200" : "text-muted-foreground"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard/billing"
                  className={cn(
                    "relative block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200",
                    "bg-violet-600 hover:bg-violet-500 text-white",
                    "shadow-lg shadow-violet-900/40 hover:shadow-violet-800/60"
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <InfinityIcon className="size-4" />
                    {t("pricing.pro.cta")}
                  </span>
                </Link>

                <p className="relative text-center text-[10px] text-zinc-600">
                  {t("pricing.pro.footnote")}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────── */}
        <section className="border-t border-border/40 px-6 py-28 md:px-10 text-center">
          <div className="relative mx-auto max-w-2xl">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 rounded-full bg-violet-600/10 blur-3xl" />
            </div>

            <SectionLabel>{t("finalCta.label")}</SectionLabel>

            <h2 className="mt-6 font-serif text-4xl md:text-5xl text-foreground leading-snug">
              {t("finalCta.titlePlain")}{" "}
              <span className="italic text-muted-foreground">{t("finalCta.titleItalic")}</span>
            </h2>
            <p className="mt-6 text-muted-foreground text-sm">
              {t("finalCta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-200",
                  "bg-foreground text-background hover:opacity-85",
                  "shadow-xl shadow-black/20"
                )}
              >
                {t("finalCta.ctaPrimary")}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("finalCta.ctaSecondary")}
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground/40">
            ARCA
          </span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              {t("footer.privacy")}
            </a>
            <a href="#" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              {t("footer.terms")}
            </a>
            <a href="#" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              {t("footer.contact")}
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground/30">
            © {new Date().getFullYear()} ARCA. {t("footer.rights")}
          </p>
        </div>
      </footer>

    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/50">
      {children}
    </p>
  );
}
