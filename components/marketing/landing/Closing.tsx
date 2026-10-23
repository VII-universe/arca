import type { OperatorInfo } from "@/lib/marketing/operator";
import { getCopy } from "./copy";
import { Waypoint } from "./Waypoint";

// The camera turns back toward home; the last question, then the footer.
export async function FinalCta() {
  const { t } = await getCopy("Marketing.finalCta");
  return (
    <Waypoint waypoint="home" className="l-final" aria-labelledby="l-final-title">
      <div className="l-wrap">
        <div className="l-final__inner l-shade">
          <h2 className="l-display l-display--final" id="l-final-title">{t("title")}</h2>
          <p className="l-lead">{t("lead")}</p>
          <a href="/login?mode=signup" className="l-btn l-btn--primary">{t("cta")}</a>
        </div>
      </div>
    </Waypoint>
  );
}

export async function Footer({ operator }: { operator: OperatorInfo }) {
  const { t } = await getCopy("Marketing.footer");
  const nav = await getCopy("Marketing.nav");
  const hasOperator = operator.name || operator.address || operator.companyId;

  return (
    <footer className="l-footer">
      <div className="l-wrap l-footer__grid">
        <div>
          <span className="l-logo">ARCA</span>
          <p className="l-footer__tagline">{t("tagline")}</p>
        </div>

        <nav aria-labelledby="l-footer-product">
          <h2 id="l-footer-product">{t("product")}</h2>
          <ul>
            <li><a href="#how-it-works">{nav.t("howItWorks")}</a></li>
            <li><a href="#for-whom">{nav.t("forWhom")}</a></li>
            <li><a href="#security">{nav.t("security")}</a></li>
            <li><a href="#pricing">{nav.t("pricing")}</a></li>
            <li><a href="/login">{nav.t("signIn")}</a></li>
          </ul>
        </nav>

        <div>
          <h2>{t("legal")}</h2>
          <p>{t("legalPending")}</p>
          {operator.email && (
            <p><a className="l-link" href={`mailto:${operator.email}`}>{t("contact")}: {operator.email}</a></p>
          )}
          <p className="l-small">{t("cookies")}</p>
          {hasOperator && (
            <address>
              <span className="l-small">{t("operator")}: </span>
              {[operator.name, operator.address, operator.companyId && t("companyId", { id: operator.companyId })]
                .filter(Boolean)
                .join(" · ")}
            </address>
          )}
        </div>
      </div>
      <div className="l-wrap l-footer__bottom">
        <span>© {new Date().getFullYear()} ARCA. {t("rights")}</span>
        <span>{t("starData")}</span>
      </div>
    </footer>
  );
}
