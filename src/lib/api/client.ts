import type { Result } from "../domain";
import type { AppData, Settings } from "../types";

/**
 * Root URL of the API, e.g. "/api" or "https://example.com/api". Defaults to the
 * same origin, which the session cookie needs: it is httpOnly and SameSite=Lax, so
 * the API must be served from the same site as the pages.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");

/** Full URL for an API path such as "/data" or "/bookings/123". */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const COLLECTIONS = ["halls", "customers", "bookings", "payments", "invoices"] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

/** Records changed by a mutation (see lib/server/db.ts). */
export interface DataDiff {
  settings?: Settings;
  upsert: Partial<{ [K in CollectionName]: AppData[K] }>;
  remove: Partial<{ [K in CollectionName]: string[] }>;
}

export type ApiResult<T> = Result<T> & { diff?: DataDiff };

interface RequestOptions {
  body?: unknown;
  /** Send the user to /login on a 401. Off for the login call itself, where 401 means wrong password. */
  redirectOnUnauthorized?: boolean;
}

function goToLogin() {
  const next = window.location.pathname + window.location.search;
  // Full page load so no business data stays in memory after the session ends
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`);
}

/** Message for a reply that didn't come from our API handlers (they always send { error }). */
function fallbackError(status: number) {
  if (status === 404 || status === 405) {
    return `The app couldn't find its server (error ${status}). Check that NEXT_PUBLIC_API_URL points to the API, then redeploy.`;
  }
  if (status >= 500) return `The server ran into a problem (error ${status}). Please try again in a moment.`;
  return `Request failed (error ${status}). Please try again.`;
}

/**
 * Calls the API and never throws: network failures, non-JSON replies and error
 * statuses all come back as { ok: false, error } with a message fit to show the user.
 * The session cookie is sent automatically.
 */
export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { body, redirectOnUnauthorized = true } = options;
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      credentials: "include",
    });
  } catch {
    return { ok: false, error: "Cannot reach the server. Check your internet connection and try again." };
  }
  const json = await res.json().catch(() => null);
  if (res.status === 401 && redirectOnUnauthorized) {
    goToLogin();
    return { ok: false, error: "Your session has expired. Please sign in again." };
  }
  if (!res.ok || !json?.ok) return { ok: false, error: json?.error ?? fallbackError(res.status) };
  return { ok: true, data: json.data as T, diff: json.diff as DataDiff | undefined };
}
