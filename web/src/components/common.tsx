import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export function Brand() {
  return (
    <a href="https://synch.run/" className="brand">
      Synch
    </a>
  );
}
export interface StatusValue {
  message: string;
  tone?: "error" | "success";
}
export function Status({
  message,
  tone,
  className = "",
  id = "status",
}: StatusValue & { className?: string; id?: string }) {
  return (
    <div
      id={id}
      className={`status ${tone ? `status--${tone}` : ""} ${className}`}
      data-kind={tone ?? "info"}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <Brand />
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
  className = "org-field",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
export function Modal({
  id,
  title,
  busy,
  onClose,
  children,
}: {
  id: string;
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      id={id}
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

/** Overlay progress without adding width or removing the accessible label. */
export function BusyButton({
  busy = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button {...props} disabled={disabled || busy} aria-busy={busy}>
      <span className="button-content">
        {busy && <span className="loading-spinner" aria-hidden="true" />}
        <span>{children}</span>
      </span>
    </button>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="loading-skeleton" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div className="skeleton-card" key={row}>
          <span className="skeleton-line skeleton-line--title" />
          <span className="skeleton-line" />
        </div>
      ))}
    </div>
  );
}
