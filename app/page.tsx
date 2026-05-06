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
import { cn } from "@/lib/utils";

export const metadata = {
  title: "ARCA — Your legacy, secured for the future.",
  description:
    "A highly secure digital time capsule and dead-man switch for your most important messages, documents, and memories.",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <ShieldCheck className="size-5" />,
    color: "text-emerald-400",
    border: "border-emerald-500/15",
    bg: "bg-emerald-500/[0.08]",
    shadow: "hover:shadow-emerald-500/10",
    title: "Military-Grade Security",
    body: "Zero-Knowledge Encryption means your content is encrypted before it ever leaves your device. Not even we can read it. Your secrets stay yours.",
    pills: ["AES-256-GCM", "End-to-end encrypted", "Zero knowledge"],
  },
  {
    icon: <Users className="size-5" />,
    color: "text-violet-400",
    border: "border-violet-500/15",
    bg: "bg-violet-500/[0.08]",
    shadow: "hover:shadow-violet-500/10",
    title: "Trusted Guardians",
    body: "Before your Arca is ever delivered, up to 3 trusted contacts are consulted first. A single false positive is unacceptable — so we built a failsafe.",
    pills: ["False-positive protection", "Email action links", "72-hour window"],
  },
  {
    icon: <Layers className="size-5" />,
    color: "text-sky-400",
    border: "border-sky-500/15",
    bg: "bg-sky-500/[0.08]",
    shadow: "hover:shadow-sky-500/10",
    title: "Rich Media & Drip Delivery",
    body: "Record voice messages and videos. Attach files. Schedule parts of your message to unlock at different times — a letter today, a video on their birthday.",
    pills: ["Voice & video", "Drip chapters", "5 GB storage"],
  },
];

const FREE_FEATURES = [
  "1 Arca",
  "50 MB storage",
  "Rich text editor",
  "Inactivity trigger",
  "Date-based trigger",
  "Trusted Guardians",
  "Smart Heartbeat webhook",
];

const PRO_FEATURES = [
  { text: "Unlimited Arcas", highlight: true },
  { text: "5 GB media storage", highlight: true },
  { text: "Zero-Knowledge Encryption", highlight: true },
  { text: "Voice & video recording", highlight: true },
  { text: "Drip chapter delivery", highlight: true },
  { text: "Physical letter delivery", highlight: true },
  { text: "Trusted Guardians", highlight: false },
  { text: "Smart Heartbeat webhook", highlight: false },
  { text: "Priority support", highlight: false },
];

const HOW_STEPS = [
  {
    n: "01",
    icon: <FileText className="size-4" />,
    title: "Compose your message",
    body: "Write, record, or upload anything — text, voice, video, photos, documents. Use the rich editor or record directly in your browser.",
  },
  {
    n: "02",
    icon: <Clock className="size-4" />,
    title: "Set your trigger",
    body: "Choose a specific delivery date, or activate the dead-man switch. ARCA monitors your presence and acts only when it should.",
  },
  {
    n: "03",
    icon: <Eye className="size-4" />,
    title: "Guardians are consulted",
    body: "Before anything is sent, your trusted contacts confirm your status. One click from them keeps everything sealed for another 30 days.",
  },
  {
    n: "04",
    icon: <Mail className="size-4" />,
    title: "Delivered at the right moment",
    body: "Recipients receive a private, secure link — nothing before, nothing after. Your words arrive exactly as intended.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
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
              ["#features", "Features"],
              ["#security", "Security"],
              ["#pricing", "Pricing"],
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
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
                "bg-foreground text-background hover:opacity-85",
                "shadow-lg shadow-black/20"
              )}
            >
              Create your Arca
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
                Secure · Private · Timeless
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.08] tracking-tight text-foreground">
              Your legacy,{" "}
              <br className="hidden sm:block" />
              <span className="italic text-muted-foreground">secured</span>{" "}
              for the future.
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-7 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
              A highly secure digital time capsule and dead-man switch for your
              most important messages, documents, and memories — delivered
              precisely when they matter most.
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
                Start building your Arca
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                See how it works
              </a>
            </div>

            {/* Trust strip */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/40">
              <span className="flex items-center gap-1.5"><Lock className="size-3" /> End-to-end encrypted</span>
              <span className="opacity-30">·</span>
              <span>Free to start</span>
              <span className="opacity-30">·</span>
              <span>No credit card required</span>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1.5"><Mic className="size-3" /> Voice &amp; video recording</span>
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────── */}
        <section id="how-it-works" className="border-t border-border/40 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-6xl">

            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
              Four steps between now{" "}
              <span className="italic text-muted-foreground">and forever.</span>
            </h2>

            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_STEPS.map((step, i) => (
                <div
                  key={step.n}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-muted-foreground/60">
                      {step.icon}
                    </span>
                    <div className="h-px flex-1 bg-border/40" />
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground/25">
                      {step.n}
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

            <SectionLabel>Built different</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
              Every detail designed{" "}
              <span className="italic text-muted-foreground">for trust.</span>
            </h2>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={cn(
                    "group relative rounded-3xl border p-7 transition-all duration-300",
                    "bg-card/40 backdrop-blur-sm",
                    "hover:shadow-xl hover:-translate-y-0.5",
                    f.border,
                    f.shadow
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "mb-5 inline-flex size-10 items-center justify-center rounded-2xl border",
                    f.bg, f.border, f.color
                  )}>
                    {f.icon}
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
                          f.border, f.color
                        )}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security deep-dive ──────────────────────────────────────── */}
        <section id="security" className="border-t border-border/40 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Text */}
              <div className="space-y-6">
                <SectionLabel>Security</SectionLabel>
                <h2 className="font-serif text-3xl md:text-4xl text-foreground leading-snug">
                  We can&apos;t read your messages.{" "}
                  <span className="italic text-muted-foreground">That&apos;s the point.</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Zero-Knowledge Encryption means your content is encrypted
                  client-side before it ever reaches our servers. We store only
                  ciphertext. Even in the event of a breach, your legacy remains
                  private.
                </p>
                <ul className="space-y-3">
                  {[
                    "AES-256-GCM encryption at rest",
                    "TLS 1.3 in transit",
                    "Tamper-proof delivery audit trail",
                    "HMAC-signed recipient tokens",
                    "Guardian failsafe before any delivery",
                  ].map((item) => (
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
                    <span className="ml-2 text-[10px] font-mono text-muted-foreground/30">arca://vault/status</span>
                  </div>

                  {[
                    { label: "Status", value: "Sealed", color: "text-emerald-400" },
                    { label: "Encryption", value: "AES-256-GCM", color: "text-sky-400" },
                    { label: "Key storage", value: "Client only", color: "text-violet-400" },
                    { label: "Guardian approval", value: "Required", color: "text-amber-400" },
                    { label: "Our access", value: "None", color: "text-rose-400" },
                    { label: "Delivery status", value: "Pending trigger", color: "text-muted-foreground" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                      <span className="text-xs text-muted-foreground/50 font-mono">{row.label}</span>
                      <span className={cn("text-xs font-semibold font-mono", row.color)}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <section id="pricing" className="border-t border-border/40 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-6xl">

            <SectionLabel>Pricing</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl text-foreground">
              Simple, honest pricing.
            </h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-md">
              Start free, no credit card required. Upgrade when you&apos;re
              ready for unlimited everything.
            </p>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">

              {/* Free */}
              <div className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-sm p-8 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Basic
                  </p>
                  <p className="text-4xl font-semibold text-foreground">$0</p>
                  <p className="text-xs text-muted-foreground mt-1">Forever free</p>
                </div>

                <ul className="space-y-2.5">
                  {FREE_FEATURES.map((f) => (
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
                  Get started free
                </Link>
              </div>

              {/* Pro */}
              <div className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-zinc-950/60 backdrop-blur-sm p-8 space-y-6 overflow-hidden shadow-2xl shadow-violet-950/30">

                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-56 rounded-full bg-violet-600/20 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                      Arca Pro
                    </p>
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      BEST VALUE
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-4xl font-semibold text-white">$9.99</p>
                    <p className="text-sm text-muted-foreground">/ month</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    or{" "}
                    <span className="font-semibold text-violet-300">$99 once</span>
                    {" "}· lifetime access
                  </p>
                </div>

                <ul className="relative space-y-2.5">
                  {PRO_FEATURES.map((f) => (
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
                    Unlock Pro
                  </span>
                </Link>

                <p className="relative text-center text-[10px] text-zinc-600">
                  Secure checkout via Stripe · Cancel anytime
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

            <SectionLabel>Begin today</SectionLabel>

            <h2 className="mt-6 font-serif text-4xl md:text-5xl text-foreground leading-snug">
              Some things are too important{" "}
              <span className="italic text-muted-foreground">to leave to chance.</span>
            </h2>
            <p className="mt-6 text-muted-foreground text-sm">
              Create your first Arca in minutes. Free to start, no card needed.
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
                Start building your Arca
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Already have an account? Sign in
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
              Privacy Policy
            </a>
            <a href="#" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              Contact
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground/30">
            © {new Date().getFullYear()} ARCA. All rights reserved.
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
