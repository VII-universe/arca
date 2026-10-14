import { CheckCircle, XCircle, Clock, AlertCircle, PenLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getContributionInvitePreview, submitContribution } from "@/app/actions/contribution";

export const dynamic = "force-dynamic";

export default async function ContributePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const t = await getTranslations("Contribute");

  // Submission just happened — show a simple thank-you instead of
  // re-rendering the form (the invite is now used anyway).
  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center"><CheckCircle className="size-12 text-emerald-500" /></div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-foreground">{t("done.title")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("done.body")}</p>
          </div>
        </div>
      </div>
    );
  }

  const preview = await getContributionInvitePreview(token);
  const sawError = status === "error";

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

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background py-16">
      <div className="max-w-lg w-full space-y-6">
        <div className="flex justify-center"><PenLine className="size-12 text-accent" /></div>

        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl text-foreground">{t("form.title", { packTitle: preview.packTitle })}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("form.body", { ownerName: preview.ownerName })}</p>
        </div>

        {sawError && (
          <p className="text-sm text-rose-400 text-center">{t("form.error")}</p>
        )}

        <form action={submitContribution.bind(null, token)} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">{t("form.nameLabel")}</label>
            <input
              name="authorName"
              required
              placeholder={t("form.namePlaceholder")}
              className="w-full rounded-lg border border-border/60 bg-card/40 px-4 py-2.5 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">{t("form.contentLabel")}</label>
            <textarea
              name="content"
              required
              rows={8}
              placeholder={t("form.contentPlaceholder")}
              className="w-full rounded-lg border border-border/60 bg-card/40 px-4 py-2.5 text-sm text-foreground resize-vertical"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-foreground text-background hover:opacity-90 text-sm font-medium px-6 py-3 transition-colors"
          >
            {t("form.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
