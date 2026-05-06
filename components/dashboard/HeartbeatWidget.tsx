"use client";

import { useState } from "react";
import { Webhook, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HeartbeatWidget({
  webhookSecret,
  appUrl,
}: {
  webhookSecret: string;
  appUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${appUrl}/api/heartbeat/${webhookSecret}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md px-6 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/20">
          <Webhook className="size-4 text-sky-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Smart Heartbeat</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hit this URL from any automation to signal you're alive.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
        <code className="flex-1 text-[11px] text-muted-foreground font-mono truncate">
          {url}
        </code>
        <button
          onClick={copy}
          className={cn(
            "shrink-0 p-1.5 rounded-lg transition-colors",
            copied
              ? "text-emerald-400 bg-emerald-400/10"
              : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/40"
          )}
          aria-label="Copy URL"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
        Send a <code className="font-mono text-muted-foreground/70">POST</code> (or GET) request to this URL from a cron job, IFTTT, Zapier, or any heartbeat service. Each successful ping resets your inactivity timer.
      </p>

      <a
        href="https://uptimerobot.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] text-sky-400/70 hover:text-sky-400 transition-colors"
      >
        <ExternalLink className="size-3" />
        Set up with UptimeRobot (free)
      </a>
    </div>
  );
}
