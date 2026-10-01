/** Decorative vault mark shared by the two management views. */
export function VaultIcon() {
  return (
    <span className="vault-icon" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 7v2m0 6v2m-5-5h2m6 0h2" />
      </svg>
    </span>
  );
}
