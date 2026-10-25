/**
 * Base URL for all API calls. Override with NEXT_PUBLIC_API_URL; otherwise the
 * live site in production and the local dev server (same origin) in development.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "https://royalmarquee.vercel.app" : "")
).replace(/\/+$/, "");

/** Absolute (or same-origin) URL for an API path such as "/api/data". */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
