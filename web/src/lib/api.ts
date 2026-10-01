import { getLocale } from "./i18n";
import { signIn } from "./navigation";

export interface User {
  id: string;
  email: string;
  name: string;
}
export interface Session {
  user: User;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export function responseError(
  value: unknown,
  fallback: string,
  status: number,
): ApiError {
  if (!record(value)) return new ApiError(fallback, status);
  const candidates = [
    value.message,
    value.error_description,
    record(value.error) ? value.error.message : value.error,
  ];
  const message = candidates.find((item) => typeof item === "string" && item);
  return new ApiError(
    typeof message === "string" ? message : fallback,
    status,
    typeof value.code === "string" ? value.code : undefined,
  );
}
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    fallback: string;
    redirectUnauthorized?: boolean;
    signal?: AbortSignal;
  },
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    signal: options.signal,
    ...(options.body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(options.body),
        }),
  });
  const value = await readJson(response);
  if (!response.ok) {
    if (response.status === 401 && options.redirectUnauthorized !== false)
      signIn(getLocale());
    throw responseError(value, options.fallback, response.status);
  }
  return value as T;
}
export async function getSession(
  fallback: string,
  signal?: AbortSignal,
): Promise<Session | null> {
  try {
    return await request<Session | null>("/api/auth/get-session", {
      fallback,
      signal,
      redirectUnauthorized: false,
    });
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      return null;
    throw error;
  }
}
export function signOut(fallback: string): Promise<unknown> {
  return request("/api/auth/sign-out", { method: "POST", body: {}, fallback });
}
