"use client";

// Catches unhandled Server Component errors on /dashboard/*
// Shows the actual error message instead of Vercel's generic "This page couldn't load"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <pre className="text-xs text-left text-muted-foreground bg-muted/40 rounded-xl p-4 overflow-auto max-h-64 border border-border/40">
          {error.message}
          {error.digest && `\n\nDigest: ${error.digest}`}
        </pre>
        <button
          onClick={reset}
          className="rounded-lg bg-foreground text-background px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <p className="text-xs text-muted-foreground">
          If this persists, please copy the error above and report it.
        </p>
      </div>
    </div>
  );
}
