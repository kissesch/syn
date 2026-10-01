export function localUrl(
  path: string,
  locale: string,
  values: Record<string, string> = {},
): string {
  const url = new URL(path, location.origin);
  url.searchParams.set("lang", locale);
  for (const [key, value] of Object.entries(values))
    url.searchParams.set(key, value);
  return url.toString();
}

export function authReturnTo(locale: string, href = location.href): string {
  const current = new URL(href);
  const requested =
    current.searchParams.get("return_to") ||
    current.searchParams.get("callbackURL") ||
    "";
  const fallback = new URL("/vaults", current.origin);
  fallback.searchParams.set("lang", locale);
  if (!requested.trim()) return fallback.toString();
  try {
    const parsed = new URL(requested, current);
    return parsed.origin === current.origin
      ? parsed.toString()
      : fallback.toString();
  } catch {
    return fallback.toString();
  }
}

export function signIn(locale: string): void {
  location.assign(localUrl("/signin", locale, { return_to: location.href }));
}

export function supportedReturnUri(value: string | null): string {
  return value === "obsidian://synch-device-login" ? value : "";
}
