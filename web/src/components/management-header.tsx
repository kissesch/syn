import type { ReactNode } from "react";

export function ManagementHeader({ id, title, subtitle, eyebrow, children }: {
  id?: string;
  title: string;
  subtitle: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <header id={id} className="management-header">
      <div className="management-header-title">
        <div className="management-header-copy">
          {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
        </div>
      </div>
      <p className="vaults-subtitle">{subtitle}</p>
      {children}
    </header>
  );
}
