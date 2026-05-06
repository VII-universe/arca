import Link from "next/link";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

type Status = "confirmed_alive" | "released" | "already_used" | "expired" | "invalid";

const CONFIG: Record<Status, {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}> = {
  confirmed_alive: {
    icon: <CheckCircle className="size-12 text-emerald-500" />,
    title: "All clear.",
    body: "You've confirmed that the owner is well. Their Arca remains sealed and the inactivity timer has been reset. Thank you for being a trusted voice.",
    accent: "text-emerald-400",
  },
  released: {
    icon: <CheckCircle className="size-12 text-sky-400" />,
    title: "Arca released.",
    body: "You've authorised delivery. The recipients will receive their Arca shortly. Thank you for honouring this trust.",
    accent: "text-sky-400",
  },
  already_used: {
    icon: <Clock className="size-12 text-amber-400" />,
    title: "Already used.",
    body: "This link has already been used. No further action is needed.",
    accent: "text-amber-400",
  },
  expired: {
    icon: <AlertCircle className="size-12 text-orange-400" />,
    title: "Link expired.",
    body: "This guardian link has expired. If action is still needed, please contact the Arca owner directly.",
    accent: "text-orange-400",
  },
  invalid: {
    icon: <XCircle className="size-12 text-rose-400" />,
    title: "Invalid link.",
    body: "This link is not valid. It may have been copied incorrectly or already removed.",
    accent: "text-rose-400",
  },
};

export default async function GuardianConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const key = (status as Status) in CONFIG ? (status as Status) : "invalid";
  const cfg = CONFIG[key];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">{cfg.icon}</div>

        <div className="space-y-2">
          <h1 className={`font-serif text-3xl ${cfg.accent}`}>{cfg.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{cfg.body}</p>
        </div>

        <Link
          href="/"
          className="inline-block text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          ARCA
        </Link>
      </div>
    </div>
  );
}
