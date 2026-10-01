import { useEffect, useState } from "react";
import { PageHeader, Status, type StatusValue } from "../components/common";
import { ApiError, errorMessage, getSession, request } from "../lib/api";
import { signIn, supportedReturnUri } from "../lib/navigation";
import type { PageProps } from "../lib/i18n";

export function DevicePage({ t, locale }: PageProps<"device">) {
  const [params] = useState(() => new URLSearchParams(location.search));
  const code = (params.get("user_code") ?? "")
    .trim()
    .replaceAll("-", "")
    .toUpperCase();
  const returnUri = supportedReturnUri(params.get("return_uri"));
  const [identity, setIdentity] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusValue>({
    message: t("checkingSession"),
  });
  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      try {
        const session = await getSession(
          t("unableToCheckSession"),
          controller.signal,
        );
        if (controller.signal.aborted) return;
        const account = session?.user?.email || session?.user?.name;
        if (!account) {
          signIn(locale);
          return;
        }
        setIdentity(t("loggedInAs", { account }));
        if (!code) {
          setStatus({ message: t("openFromObsidian") });
          return;
        }
        setStatus({ message: t("checkingDevice") });
        const result = await request<{ status: string }>(
          `/api/auth/device?user_code=${encodeURIComponent(code)}`,
          { fallback: t("invalidCode"), signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setDeviceStatus(result.status);
        setStatus(
          result.status === "approved"
            ? { message: t("approved"), tone: "success" }
            : result.status === "denied"
              ? { message: t("denied"), tone: "error" }
              : result.status === "pending"
                ? { message: t("approveToFinish") }
                : { message: t("invalidOrConsumed"), tone: "error" },
        );
      } catch (error) {
        if (!controller.signal.aborted)
          setStatus({
            message: errorMessage(error, t("unableToLoad")),
            tone: "error",
          });
      }
    }
    void initialize();
    return () => controller.abort();
  }, [code, locale, t]);
  async function decide(decision: "approve" | "deny") {
    if (busy || !code || deviceStatus !== "pending") return;
    setBusy(true);
    setStatus({ message: t(decision === "approve" ? "approving" : "denying") });
    try {
      await request(`/api/auth/device/${decision}`, {
        method: "POST",
        body: { userCode: code },
        fallback: t("unableToUpdate"),
      });
      setDeviceStatus(decision === "approve" ? "approved" : "denied");
      setStatus({
        message: t(decision === "approve" ? "approved" : "denied"),
        tone: decision === "approve" ? "success" : "error",
      });
    } catch (error) {
      setStatus({
        message:
          error instanceof ApiError
            ? error.message
            : t("apiUnavailableWithHint"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page page--medium">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <p className="page-subtitle">{t("hint")}</p>
      </PageHeader>
      <Status {...status} className="status--spaced" />
      {identity && (
        <p id="identity" className="identity">
          {identity}
        </p>
      )}
      {deviceStatus === "pending" && (
        <div id="approval-panel" className="approval-panel">
          <button
            id="approve-button"
            type="button"
            className="btn btn--primary btn--block"
            disabled={busy}
            onClick={() => void decide("approve")}
          >
            {t("approve")}
          </button>
          <button
            id="deny-button"
            type="button"
            className="btn btn--secondary btn--block"
            disabled={busy}
            onClick={() => void decide("deny")}
          >
            {t("deny")}
          </button>
        </div>
      )}
      {deviceStatus === "approved" && returnUri && (
        <div id="return-panel" className="return-panel">
          <a
            id="return-button"
            className="btn btn--primary btn--block"
            href={returnUri}
          >
            {t("returnToObsidian")}
          </a>
          <p className="return-hint">{t("returnHint")}</p>
        </div>
      )}
    </div>
  );
}
