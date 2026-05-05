import Link from "next/link";

export const metadata = {
  title: "ARCA — Your words, preserved with care.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-border/50">
        <span className="text-sm font-semibold tracking-[0.2em] uppercase text-foreground">
          ARCA
        </span>
        <Link
          href="/dashboard"
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-all duration-300"
        >
          Sign in
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 md:py-36 text-center">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Eyebrow */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/60">
            Secure · Private · Timeless
          </p>

          {/* Headline */}
          <h1 className="font-serif text-5xl md:text-7xl font-normal leading-[1.1] tracking-tight text-foreground">
            Your words,{" "}
            <span className="italic text-muted-foreground">preserved</span>{" "}
            with care.
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            ARCA is a secure vault for messages that matter most — time
            capsules sent on a chosen date, and legacy letters delivered
            automatically if you go silent for too long.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="rounded-full bg-foreground text-background px-8 py-3.5 text-sm font-semibold hover:opacity-90 transition-all duration-300"
            >
              Start your Arca →
            </Link>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Subtle decorative divider */}
        <div className="mt-24 flex items-center gap-4 opacity-20">
          <div className="h-px w-16 bg-border" />
          <span className="text-muted-foreground text-xs select-none">◈</span>
          <div className="h-px w-16 bg-border" />
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-border/50 px-6 py-20 md:px-12">
        <div className="mx-auto max-w-4xl">

          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/60 text-center mb-14">
            How it works
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-muted-foreground/40 tabular-nums">
                    {step.number}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="font-serif text-xl text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="border-t border-border/50 px-6 py-20 md:px-12 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground leading-snug">
            Some things are too important{" "}
            <span className="italic text-muted-foreground">to leave to chance.</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Create your first Arca in minutes. Free to start.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-foreground text-background px-8 py-3.5 text-sm font-semibold hover:opacity-90 transition-all duration-300"
          >
            Start your Arca →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 px-6 py-6 md:px-12 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground/40">
          ARCA
        </span>
        <p className="text-[10px] text-muted-foreground/30">
          Your words, preserved with care.
        </p>
      </footer>
    </div>
  );
}

const STEPS = [
  {
    number: "01",
    title: "Write & upload",
    description:
      "Compose your message — text, audio, video, or files. Everything is stored securely and privately.",
  },
  {
    number: "02",
    title: "Set your trigger",
    description:
      "Choose a specific date, or activate the inactivity switch — ARCA monitors your presence and acts accordingly.",
  },
  {
    number: "03",
    title: "We deliver when it matters",
    description:
      "Your recipients receive a secure, private link at exactly the right moment. Nothing before, nothing after.",
  },
];
