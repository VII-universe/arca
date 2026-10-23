import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

type Status = "confirmed_alive" | "released" | "already_used" | "expired" | "invalid";

const ICON: Record<Status, React.ReactNode> = {
  confirmed_alive: <CheckCircle className="size-12 text-emerald-500" />,
  released: <CheckCircle className="size-12 text-sky-400" />,
  already_used: <Clock className="size-12 text-amber-400" />,
  expired: <AlertCircle className="size-12 text-orange-400" />,
  invalid: <XCircle className="size-12 text-rose-400" />,
};

const ACCENT: Record<Status, string> = {
  confirmed_alive: "text-emerald-400",
  released: "text-sky-400",
  already_used: "text-amber-400",
  expired: "text-orange-400",
  invalid: "text-rose-400",
};

export default async function GuardianConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const key = (status as Status) in ICON ? (status as Status) : "invalid";
  const t = await getTranslations("GuardianConfirmed");

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">{ICON[key]}</div>

        <div className="space-y-2">
          <h1 className={`font-serif text-3xl ${ACCENT[key]}`}>{t(`${key}.title`)}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t(`${key}.body`)}</p>
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
