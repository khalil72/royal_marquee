"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BookingInput, CustomerInput, HallInput, PaymentInput, Result } from "./domain";
import { emptyData } from "./seed";
import type { AppData, Booking, BookingStatus, Customer, Hall, Invoice, Payment, Settings } from "./types";

export type { BookingInput, CustomerInput, HallInput, PaymentInput, Result } from "./domain";

const COLLECTIONS = ["halls", "customers", "bookings", "payments", "invoices"] as const;

/** Changes returned by the server after a mutation (see lib/server/db.ts). */
interface Diff {
  settings?: Settings;
  upsert: Partial<{ [K in (typeof COLLECTIONS)[number]]: AppData[K] }>;
  remove: Partial<{ [K in (typeof COLLECTIONS)[number]]: string[] }>;
}

interface StoreState extends AppData {
  hydrated: boolean;
  loadError: string | null;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  load: () => Promise<void>;
  logout: () => Promise<void>;

  addCustomer: (input: CustomerInput) => Promise<Result<Customer>>;
  updateCustomer: (id: string, input: CustomerInput) => Promise<Result<Customer>>;
  deleteCustomer: (id: string) => Promise<Result<null>>;

  addHall: (input: HallInput) => Promise<Result<Hall>>;
  updateHall: (id: string, input: HallInput) => Promise<Result<Hall>>;
  deleteHall: (id: string) => Promise<Result<null>>;

  createBooking: (input: BookingInput) => Promise<Result<Booking>>;
  updateBooking: (id: string, input: BookingInput) => Promise<Result<Booking>>;
  setBookingStatus: (id: string, status: BookingStatus, note?: string) => Promise<Result<Booking>>;
  deleteBooking: (id: string) => Promise<Result<null>>;

  addPayment: (bookingId: string, input: PaymentInput) => Promise<Result<Payment>>;
  voidPayment: (paymentId: string, reason: string) => Promise<Result<Payment>>;

  issueInvoice: (bookingId: string, forceNew?: boolean) => Promise<Result<Invoice>>;

  updateSettings: (patch: Partial<Omit<Settings, "logo">> & { logo?: string | null }) => Promise<Result<Settings>>;
  importData: (data: AppData) => Promise<Result<null>>;
  resetData: (withDemo: boolean) => Promise<Result<null>>;
}

function goToLogin() {
  const next = window.location.pathname + window.location.search;
  // Full page load so no business data stays in memory after the session ends
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<Result<T> & { diff?: Diff }> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Cannot reach the server. Check your internet connection and try again." };
  }
  if (res.status === 401) {
    goToLogin();
    return { ok: false, error: "Your session has expired. Please sign in again." };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) return { ok: false, error: json?.error ?? `Request failed (${res.status}).` };
  return { ok: true, data: json.data as T, diff: json.diff as Diff | undefined };
}

function applyDiff(state: AppData, diff: Diff): Partial<AppData> {
  const patch: Partial<AppData> = {};
  if (diff.settings) patch.settings = diff.settings;
  for (const name of COLLECTIONS) {
    const upserts = (diff.upsert[name] ?? []) as { id: string }[];
    const removed = new Set(diff.remove[name] ?? []);
    if (!upserts.length && !removed.size) continue;
    const byId = new Map(upserts.map((r) => [r.id, r]));
    const current = state[name] as { id: string }[];
    const kept = current.filter((r) => !removed.has(r.id)).map((r) => byId.get(r.id) ?? r);
    const existing = new Set(current.map((r) => r.id));
    const added = upserts.filter((r) => !existing.has(r.id));
    // Newest first for customers/bookings, chronological for the rest
    const merged = name === "customers" || name === "bookings" ? [...added, ...kept] : [...kept, ...added];
    (patch as Record<string, unknown>)[name] = merged;
  }
  return patch;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** Send a mutation and merge the server's changes into local state. */
      const mutate = async <T,>(method: string, path: string, body?: unknown): Promise<Result<T>> => {
        const result = await request<T>(method, path, body);
        if (result.ok && result.diff) set(applyDiff(get(), result.diff));
        return result.ok ? { ok: true, data: result.data } : result;
      };

      return {
        ...emptyData(),
        hydrated: false,
        loadError: null,
        sidebarCollapsed: false,
        toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

        load: async () => {
          set({ loadError: null });
          const result = await request<AppData>("GET", "/api/data");
          if (result.ok) set({ ...result.data, hydrated: true });
          else set({ loadError: result.error });
        },
        logout: async () => {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/login");
        },

        addCustomer: (input) => mutate("POST", "/api/customers", input),
        updateCustomer: (id, input) => mutate("PUT", `/api/customers/${id}`, input),
        deleteCustomer: (id) => mutate("DELETE", `/api/customers/${id}`),

        addHall: (input) => mutate("POST", "/api/halls", input),
        updateHall: (id, input) => mutate("PUT", `/api/halls/${id}`, input),
        deleteHall: (id) => mutate("DELETE", `/api/halls/${id}`),

        createBooking: (input) => mutate("POST", "/api/bookings", input),
        updateBooking: (id, input) => mutate("PUT", `/api/bookings/${id}`, input),
        setBookingStatus: (id, status, note) => mutate("POST", `/api/bookings/${id}/status`, { status, note }),
        deleteBooking: (id) => mutate("DELETE", `/api/bookings/${id}`),

        addPayment: (bookingId, input) => mutate("POST", `/api/bookings/${bookingId}/payments`, input),
        voidPayment: (paymentId, reason) => mutate("POST", `/api/payments/${paymentId}/void`, { reason }),

        issueInvoice: (bookingId, forceNew = false) =>
          mutate("POST", `/api/bookings/${bookingId}/invoices`, { forceNew }),

        updateSettings: (patch) => mutate("PUT", "/api/settings", patch),
        importData: (data) => mutate("POST", "/api/data/import", data),
        resetData: (withDemo) => mutate("POST", "/api/data/reset", { demo: withDemo, confirm: "RESET" }),
      };
    },
    {
      // Only the sidebar preference lives in the browser; all records come from the server
      name: "marquee-ui",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);

export function exportData(): AppData {
  const { settings, halls, customers, bookings, payments, invoices } = useStore.getState();
  return { settings, halls, customers, bookings, payments, invoices };
}
