import { useEffect, useRef } from "react";
import { BusyButton } from "./common";
import type { User } from "../lib/api";
import type { Translator } from "../lib/i18n";

export function AccountMenu({ user, t, busy, onSignOut }: {
  user: User;
  t: Translator<"vaults">;
  busy: boolean;
  onSignOut: () => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const name = user.name || user.email || t("signedIn");
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() || "?";

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) {
        menu.current.open = false;
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return (
    <details
      ref={menu}
      className="account-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current?.open) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="account-trigger" aria-label={name}>
        <span className="account-avatar" aria-hidden="true">{initial}</span>
        <svg className="account-chevron" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m8 10 4 4 4-4" />
        </svg>
      </summary>
      <div className="account-panel">
        <div className="account-identity">
          <p className="account-name">{name}</p>
          {user.email && user.email !== name && <p className="account-email">{user.email}</p>}
        </div>
        <BusyButton busy={busy} id="logout" type="button" className="account-signout" disabled={busy} onClick={onSignOut}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m6-12 4 4-4 4m-8-4h12" />
          </svg>
          {t("signOut")}
        </BusyButton>
      </div>
    </details>
  );
}
