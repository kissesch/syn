import type { Translator } from "../lib/i18n";

export function VaultSetup({ t, email, vaultName }: {
  t: Translator<"vaults">;
  email: string;
  vaultName?: string;
}) {
  const connecting = vaultName !== undefined;
  return (
    <section className="vault-setup" aria-label={t("setupSteps")}>
      <div className="vault-setup-actions">
        <a className="btn btn--primary btn--compact" href="https://community.obsidian.md/plugins/synch" target="_blank" rel="noreferrer">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />
          </svg>
          {t("setupInstall")}
        </a>
        <a className="management-link" href="obsidian://synch-device-login">{t("setupInstalled")}</a>
      </div>
      <ol className="vault-setup-steps">
        <li>
          <span className="step-marker" aria-hidden="true">1</span>
          <div>
            <h3>{t("emptyGuideInstallTitle")}</h3>
            <p>{t("emptyGuideInstallBody")}</p>
          </div>
        </li>
        <li>
          <span className="step-marker" aria-hidden="true">2</span>
          <div>
            <h3>{t("emptyGuideSignInTitle")}</h3>
            <p>{t("setupSignIn", { email })}</p>
          </div>
        </li>
        <li>
          <span className="step-marker" aria-hidden="true">3</span>
          <div>
            <h3>{t(connecting ? "setupConnectStep" : "emptyGuideCreateTitle")}</h3>
            <p>{connecting ? t("setupConnectBody", { name: vaultName }) : t("setupCreateBody")}</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
