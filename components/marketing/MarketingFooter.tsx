import { getTranslations } from "next-intl/server";
import type { OperatorInfo } from "@/lib/marketing/operator";

export async function MarketingFooter({ operator }: { operator: OperatorInfo }) {
  const t = await getTranslations("Marketing.footer");
  const nav = await getTranslations("Marketing.nav");
  const hasOperator = operator.name || operator.address || operator.companyId;

  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer__grid">
          <div>
            <span className="mk-logo">ARCA</span>
            <p className="mk-footer__tagline">{t("tagline")}</p>
          </div>

          <nav aria-labelledby="mk-footer-product">
            <h2 id="mk-footer-product">{t("product")}</h2>
            <ul>
              <li><a href="#how-it-works">{nav("howItWorks")}</a></li>
              <li><a href="#for-whom">{nav("forWhom")}</a></li>
              <li><a href="#security">{nav("security")}</a></li>
              <li><a href="#pricing">{nav("pricing")}</a></li>
              <li><a href="/login">{nav("signIn")}</a></li>
            </ul>
          </nav>

          <div>
            <h2>{t("legal")}</h2>
            <p style={{ margin: 0 }}>{t("legalPending")}</p>
            {operator.email && (
              <p style={{ margin: "12px 0 0" }}>
                <a href={`mailto:${operator.email}`} style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>
                  {t("contact")}: {operator.email}
                </a>
              </p>
            )}
            <p className="mk-small" style={{ margin: "16px 0 0" }}>{t("cookies")}</p>
            {hasOperator && (
              <address style={{ marginTop: 16 }}>
                <span className="mk-small">{t("operator")}: </span>
                {[operator.name, operator.address, operator.companyId && t("companyId", { id: operator.companyId })]
                  .filter(Boolean)
                  .join(" · ")}
              </address>
            )}
          </div>
        </div>

        <div className="mk-footer__bottom">
          <span>© {new Date().getFullYear()} ARCA. {t("rights")}</span>
        </div>
      </div>
    </footer>
  );
}
