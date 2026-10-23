import { CheckCircle, XCircle, Clock, AlertCircle, ShieldAlert } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getGuardianActionPreview, confirmGuardianAction } from "@/app/actions/guardian";
import { buildGuardianAiSummary } from "@/lib/ai/guardian-summary";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function GuardianActionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("GuardianAction");
  const locale = (await getLocale()) as Locale;

  const preview = token ? await getGuardianActionPreview(token) : { status: "invalid" as const };

  if (preview.status !== "valid") {
    const ICON = {
      already_used: <Clock className="size-12 text-amber-400" />,
      expired: <AlertCircle className="size-12 text-orange-400" />,
      invalid: <XCircle className="size-12 text-rose-400" />,
    } as const;
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">{ICON[preview.status]}</div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-foreground">{t(`${preview.status}.title`)}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t(`${preview.status}.body`)}</p>
          </div>
        </div>
      </div>
    );
  }

  const { action, ownerName, packTitle, recipientNames } = preview;
  const aiSummary = await buildGuardianAiSummary({ locale, action, ownerName, packTitle, recipientNames });
  const isRelease = action === "RELEASE";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background py-16">
      <div className="max-w-lg w-full space-y-6">
        <div className="flex justify-center">
          {isRelease
            ? <ShieldAlert className="size-12 text-rose-400" />
            : <CheckCircle className="size-12 text-emerald-500" />}
        </div>

        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl text-foreground">
            {isRelease ? t("confirmRelease.title") : t("confirmAlive.title")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isRelease
              ? t("confirmRelease.body", { ownerName, packTitle })
              : t("confirmAlive.body", { ownerName, packTitle })}
          </p>
        </div>

        {isRelease && recipientNames.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm text-foreground">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t("recipientsLabel")}</div>
            <div>{recipientNames.join(", ")}</div>
          </div>
        )}

        {aiSummary && (
          <div className="rounded-xl border border-border/40 bg-muted/30 px-5 py-4 text-sm text-muted-foreground italic">
            {t("aiSummaryPrefix")} {aiSummary}
          </div>
        )}

        {isRelease && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/5 px-5 py-4 text-sm text-rose-400 font-medium text-center">
            {t("confirmRelease.warning")}
          </div>
        )}

        <form action={confirmGuardianAction.bind(null, token!)}>
          <button
            type="submit"
            className={
              isRelease
                ? "w-full rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium px-6 py-3 transition-colors"
                : "w-full rounded-lg bg-foreground text-background hover:opacity-90 text-sm font-medium px-6 py-3 transition-colors"
            }
          >
            {isRelease ? t("confirmRelease.button") : t("confirmAlive.button")}
          </button>
        </form>
      </div>
    </div>
  );
}
