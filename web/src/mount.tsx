import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import {
  getLocale,
  translator,
  type Page,
  type PageProps,
  type MessageKey,
} from "./lib/i18n";
import "./styles.css";

export async function mount<P extends Page>(
  page: P,
  Component: ComponentType<PageProps<P>>,
  titleKey: MessageKey<P>,
) {
  const locale = getLocale();
  document.documentElement.lang = locale;
  const t = await translator(page, locale);
  document.title = `${t(titleKey)} · Synch`;
  createRoot(document.getElementById("root")!).render(
    <Component t={t} locale={locale} />,
  );
}
