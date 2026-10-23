import { getTranslations } from "next-intl/server";
import type { ConceptHeroCopy } from "./ConceptHero";

// Real, verified copy from the Marketing namespace — the concept only changes form.
export async function heroCopy(): Promise<ConceptHeroCopy> {
  const t = await getTranslations({ locale: "cs", namespace: "Marketing" });
  return {
    kicker: t("hero.kicker"),
    title: t.rich("hero.title", { em: (c) => <em>{c}</em> }),
    lead: t("hero.lead"),
    question: t("hero.composer.question"),
    recipients: ["child", "partner", "self", "mom", "other"].map((k) => t(`hero.composer.recipients.${k}`)),
    message: "Až tohle budeš číst, budeš o hlavu vyšší než já.",
    seal: t("hero.composer.seal"),
    gone: t("hero.composer.when.gone"),
    nav: {
      links: [t("nav.howItWorks"), t("nav.forWhom"), t("nav.security"), t("nav.pricing")],
      signIn: t("nav.signIn"),
      start: t("nav.start"),
    },
  };
}
